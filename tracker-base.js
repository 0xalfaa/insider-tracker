const { ethers } = require('ethers');
const fs = require('fs');

// Hubungkan ke node Ethereum
const provider = new ethers.providers.JsonRpcProvider('https://base-rpc.publicnode.com');

// Rentang nilai transfer yang dicurigai
const min_value_to_track = ethers.utils.parseEther('0.02');
const max_value_to_track = ethers.utils.parseEther('0.16');
const minimum_transfer_count = 3;
const maxRetries = 3;
const delayBetweenRetries = 1000; // in milliseconds

// File tempat menyimpan hasil
const suspiciousAddressesFile = 'suspicious_addresses.json';

// Fungsi untuk menunggu dalam milidetik
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi untuk memeriksa apakah nilai-nilai transfer mirip
function areTransfersSimilar(transfers) {
    const epsilon = 0.001; // Rentang perbedaan yang diijinkan
    for (let i = 1; i < transfers.length; i++) {
        if (Math.abs(parseFloat(transfers[i]) - parseFloat(transfers[i - 1])) > epsilon) {
            return false;
        }
    }
    return true;
}

// Fungsi untuk memeriksa transfer dari wallet tertentu
async function trackTransactions() {
    let latestBlockChecked = await provider.getBlockNumber();

    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock > latestBlockChecked) {
                console.log(`Checking blocks from ${latestBlockChecked + 1} to ${currentBlock}`);
                await checkTransactionsForValue(latestBlockChecked + 1, currentBlock);
                latestBlockChecked = currentBlock;
            }
        } catch (error) {
            console.error("Error in tracking loop:", error);
        }
    }, 15000); // Periksa setiap 15 detik
}

// Fungsi untuk melakukan retry pada panggilan API
async function fetchWithRetry(fetchFunction, retries = maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetchFunction();
        } catch (error) {
            console.error(`Error fetching data, retrying (${i + 1}/${retries})...`, error);
            await delay(delayBetweenRetries);
        }
    }
    throw new Error('Max retries reached');
}

async function checkTransactionsForValue(startBlock, endBlock) {
    const transferCount = {};
    const suspiciousAddresses = [];

    for (let i = startBlock; i <= endBlock; i++) {
        console.log(`Processing block ${i}`);
        try {
            const block = await fetchWithRetry(() => provider.getBlockWithTransactions(i));

            for (const tx of block.transactions) {
                if (!tx.to) continue; // Skip transactions without a 'to' address (non-ETH transfers)

                const value = ethers.BigNumber.from(tx.value);
                if (value.gte(min_value_to_track) && value.lte(max_value_to_track)) {
                    if (transferCount[tx.from]) {
                        transferCount[tx.from].count++;
                        transferCount[tx.from].transfers.push(ethers.utils.formatEther(value));
                    } else {
                        transferCount[tx.from] = { count: 1, transfers: [ethers.utils.formatEther(value)] };
                    }

                    if (transferCount[tx.from].count >= minimum_transfer_count && !suspiciousAddresses.includes(tx.from)) {
                        if (areTransfersSimilar(transferCount[tx.from].transfers)) {
                            suspiciousAddresses.push(tx.from);
                            console.log(`Suspicious address detected: ${tx.from}`);
                            console.log(`Transfers: ${transferCount[tx.from].transfers.join(', ')} ETH`);

                            // Update file with suspicious addresses immediately
                            fs.appendFileSync(suspiciousAddressesFile, JSON.stringify({ address: tx.from, transfer_count: transferCount[tx.from].count, transfers: transferCount[tx.from].transfers }, null, 4) + '\n');
                            console.log("Suspicious address saved to suspicious_addresses.json");
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing block ${i}:`, error);
        }
    }
}

// Menangani penghentian program dengan bersih
process.on('SIGINT', () => {
    console.log('Program stopped.');
    process.exit();
});

// Mulai melacak transaksi
trackTransactions().catch(console.error);
