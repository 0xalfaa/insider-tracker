const { ethers } = require('ethers');
const fs = require('fs');

// Connect to the BSC node
const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

// Suspicious transfer range
const min_value_to_track = ethers.utils.parseEther('0.02');
const max_value_to_track = ethers.utils.parseEther('0.025');
const minimum_transfer_count = 3;
const epsilon = ethers.utils.parseEther('0.00001'); // Allowed difference range

// File to save results
const suspiciousAddressesFile = 'suspicious_addresses.json';

// Function to wait in milliseconds
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to check if values are similar
const isSimilar = (value1, value2) => {
    return value1.sub(value2).abs().lte(epsilon);
};

// Function to track transactions from a particular wallet
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
    }, 15000); // Check every 15 seconds
}

// Function to fetch data with retries
async function fetchWithRetry(fetchFunction, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetchFunction();
        } catch (error) {
            console.error(`Error fetching data, retrying (${i + 1}/3)...`, error);
            await delay(1000); // 1 second delay between retries
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
                const value = ethers.BigNumber.from(tx.value);

                // Only consider transactions that transfer ETH
                if (tx.to && value.gte(min_value_to_track) && value.lte(max_value_to_track)) {
                    if (transferCount[tx.from]) {
                        const lastTransfer = ethers.utils.parseEther(transferCount[tx.from].transfers[transferCount[tx.from].transfers.length - 1]);
                        if (isSimilar(lastTransfer, value)) {
                            transferCount[tx.from].count++;
                            transferCount[tx.from].transfers.push(ethers.utils.formatEther(value));
                        }
                    } else {
                        transferCount[tx.from] = { count: 1, transfers: [ethers.utils.formatEther(value)] };
                    }

                    if (transferCount[tx.from].count >= minimum_transfer_count && !suspiciousAddresses.includes(tx.from)) {
                        suspiciousAddresses.push(tx.from);
                        console.log(`Suspicious address detected: ${tx.from}`);
                        console.log(`Transfers: ${transferCount[tx.from].transfers.join(', ')} ETH`);

                        // Update file with suspicious addresses immediately
                        fs.appendFileSync(suspiciousAddressesFile, JSON.stringify({ address: tx.from, transfer_count: transferCount[tx.from].count, transfers: transferCount[tx.from].transfers }, null, 4) + '\n');
                        console.log("Suspicious address saved to suspicious_addresses.json");
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing block ${i}:`, error);
        }
    }
}

// Handle clean program shutdown
process.on('SIGINT', () => {
    console.log('Program stopped.');
    process.exit();
});

// Start tracking transactions
trackTransactions().catch(console.error);
