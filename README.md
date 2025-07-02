# R2 Testnet Bot 🤖

 R2 Testnet Bot for automating transactions on the R2 Money Sepolia testnet. This CLI tool simplifies interactions with R2 Money's DeFi ecosystem, allowing users to perform swaps and manage liquidity with ease.


## Features ✨

- 🔄 **Token Swaps**: Swap between R2 and USDC tokens
- 💧 **Liquidity Management**: Add/remove liquidity from R2 pools
- ⚙️ **Configurable Parameters**: Set transaction count, percentage, and delays
- 📊 **Real-time Balances**: View token balances before/after transactions
- 🛡️ **Secure Operations**: Private keys stored locally in .env file
- 📱 **CLI Interface**: User-friendly command line interface

## Installation 💻

1. Clone the repository:
```bash
git clone https://github.com/chenfly2/R2-BOT.git
cd R2-TESTNET-BOT
```

2. Install dependencies:
```bash
npm install
```

3. Create your `.env` file:

PRIVATE_KEY=0xYourFirstPrivateKey
PRIVATE_KEY=0xYourSecondPrivateKey
PRIVATE_KEY=0xYourThirdPrivateKey

## Usage 🚀

Start the bot:
```bash
npm start
```

### Interactive Flow:
1. **Select Transaction Type**:
   - 🔄 Swap R2 ↔ USDC
   - 💧 Add Liquidity
   - 🗑️ Remove Liquidity

2. **Configure Parameters**:
   - Percentage of tokens to use (5-100%)
   - Number of transactions (1-100)
   - Delay between transactions (5-100 seconds)

3. **Execute Transactions**:
   - Real-time transaction feedback
   - Automatic balance updates
   - Detailed success/error messages

## Configuration ⚙️

Customize token addresses in `bot.js` if needed (defaults are set for Sepolia testnet):
```javascript
// Token addresses
const R2_TOKEN_ADDRESS = '0xb816bB88f836EA75Ca4071B46FF285f690C43bb7';
const USDC_TOKEN_ADDRESS = '0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2';
// ... other token addresses
```

## Supported Actions

### Token Swaps 🔄
- R2 → USDC
- USDC → R2
- Configurable slippage tolerance

### Liquidity Management 💧
**Supported Pools:**
- R2-USDC
- R2-R2USD
- USDC-R2USD
- R2USD-sR2USD

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
