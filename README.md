# Insider Tracker

The Insider Tracker repository contains tools for tracking suspicious transactions on the Ethereum and Base networks. This repository includes two main trackers: `tracker-eth` for Ethereum and `tracker-base` for the Base network.

## Features

- Tracks suspicious transactions based on specific value ranges.
- Logs suspicious addresses that meet certain transfer count criteria.
- Supports retry mechanisms for API calls to handle transient errors.
- Outputs results to JSON files for further analysis.

## Getting Started

### Prerequisites

- Node.js installed on your machine.
- `ethers.js` library.
- Access to Ethereum and Base network nodes.

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/0xalfaa/insider-tracker.git
    cd insider-tracker
    ```

2. Install dependencies:

    ```sh
    npm install ethers
    ```

### Usage

#### Ethereum Tracker

The Ethereum tracker script monitors transactions on the Ethereum network and logs addresses that transfer amounts within a specified range. To run the Ethereum tracker:

1. Update the RPC URL in `tracker-eth.js`:

    ```javascript
    const provider = new ethers.providers.JsonRpcProvider('YOUR_ETHEREUM_RPC_URL');
    ```

2. Run the script:

    ```sh
    node tracker-eth.js
    ```

#### Base Tracker

The Base tracker script functions similarly to the Ethereum tracker but is tailored for the Base network. To run the Base tracker:

1. Update the RPC URL in `tracker-base.js`:

    ```javascript
    const provider = new ethers.providers.JsonRpcProvider('YOUR_BASE_RPC_URL');
    ```

2. Run the script:

    ```sh
    node tracker-base.js
    ```

### Configuration

Both trackers use the following configuration parameters:

- **min_value_to_track**: The minimum transfer value to track.
- **max_value_to_track**: The maximum transfer value to track.
- **minimum_transfer_count**: The minimum number of transfers required to flag an address as suspicious.
- **maxRetries**: The maximum number of retries for API calls.
- **delayBetweenRetries**: The delay between retries in milliseconds.

These parameters can be adjusted in the respective scripts to suit your tracking needs.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or suggestions, please open an issue or contact the repository owner.

---

