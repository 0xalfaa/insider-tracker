const { ethers } = require('ethers');
const fs = require('fs');

// Connect to the Ethereum node
const provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/RtNcBY_UIiUTzzx25Y0GdBJUc1qGsj81');

// Range of suspicious transfer values
const min_value_to_track = ethers.utils.parseEther('0.1');
const max_value_to_track = ethers.utils.parseEther('0.6');
const minimum_transfer_count = 3;
const maxRetries = 3;
const delayBetweenRetries = 1000; // in milliseconds

// File to store suspicious addresses
const suspiciousAddressesFile = 'suspicious_eth.json';

// Function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Set to track processed addresses
const processedAddresses = new Set();

// Function to log suspicious address immediately
const logSuspiciousAddress = (address, transferCount, transfers) => {
    const logData = { address, transfer_count: transferCount, transfers };
    fs.appendFileSync(suspiciousAddressesFile, JSON.stringify(logData, null, 4) + '\n');
    console.log(`Suspicious address detected: ${address}`);
    console.log(`Transfer count: ${transferCount}`);
    console.log(`Transfers: ${transfers.join(', ')} ETH`);
    console.log("Suspicious address saved to suspicious_eth.json");
};

// Function to track transactions from the latest block
const trackTransactions = async () => {
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
};

// Function to fetch data with retries
const fetchWithRetry = async (fetchFunction, retries = maxRetries) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetchFunction();
        } catch (error) {
            console.error(`Error fetching data, retrying (${i + 1}/${retries})...`, error);
            await delay(delayBetweenRetries);
        }
    }
    throw new Error('Max retries reached');
};

// Function to check transactions for suspicious values
const checkTransactionsForValue = async (startBlock, endBlock) => {
    const transferCount = {};

    for (let i = startBlock; i <= endBlock; i++) {
        console.log(`Processing block ${i}`);
        try {
            const block = await fetchWithRetry(() => provider.getBlockWithTransactions(i));

            for (const tx of block.transactions) {
                const value = ethers.BigNumber.from(tx.value);
                if (value.gte(min_value_to_track) && value.lte(max_value_to_track)) {
                    if (transferCount[tx.from]) {
                        transferCount[tx.from].count++;
                        transferCount[tx.from].transfers.push(ethers.utils.formatEther(value));
                    } else {
                        transferCount[tx.from] = { count: 1, transfers: [ethers.utils.formatEther(value)] };
                    }

                    if (transferCount[tx.from].count >= minimum_transfer_count && !processedAddresses.has(tx.from)) {
                        processedAddresses.add(tx.from); // Add to the set
                        logSuspiciousAddress(tx.from, transferCount[tx.from].count, transferCount[tx.from].transfers);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing block ${i}:`, error);
        }
    }
};

// Handle program termination gracefully
process.on('SIGINT', () => {
    console.log('Program stopped.');
    process.exit();
});

// Start tracking transactions
trackTransactions().catch(console.error);
