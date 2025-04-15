require('dotenv').config();
const ethers = require('ethers');
const readline = require('readline');
const chalk = require('chalk');
const cliSpinners = require('cli-spinners');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs').promises;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const network = {
  name: 'Tea Sepolia Testnet 🌐',
  rpc: 'https://tea-sepolia.g.alchemy.com/public',
  chainId: 10218,
  symbol: 'TEA',
  explorer: 'https://sepolia.tea.xyz/'
};

const erc20ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

const stTeaABI = [
  'function stake() payable',
  'function balanceOf(address owner) view returns (uint256)',
  'function withdraw(uint256 _amount)'
];

const stTeaContractAddress = '0x04290DACdb061C6C9A0B9735556744be49A64012';

async function loadProxies() {
  try {
    const data = await fs.readFile('proxies.txt', 'utf8');
    const proxies = data.split('\n').map(line => line.trim()).filter(line => line);
    if (proxies.length === 0) {
      console.log(chalk.yellow('No proxies found in proxies.txt. Running without proxy.'));
      return null;
    }
    return proxies;
  } catch (error) {
    console.error(chalk.red('Error reading proxies.txt:', error.message, '❌'));
    return null;
  }
}

function getRandomProxy(proxies) {
  if (!proxies || proxies.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * proxies.length);
  return proxies[randomIndex];
}

function parseProxy(proxy) {
  if (!proxy) return null;
  let proxyUrl = proxy;
  if (!proxy.startsWith('http://') && !proxy.startsWith('https://')) {
    proxyUrl = `http://${proxy}`;
  }
  return proxyUrl;
}

function showSpinner(message) {
  const spinner = cliSpinners.dots.frames;
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.yellow(message)} ${spinner[i++ % spinner.length]}`);
  }, 100);
  return () => {
    clearInterval(interval);
    process.stdout.write('\r');
  };
}

async function confirmTransaction(details) {
  console.log(chalk.white('┌─── Transaction Preview ───┐'));
  for (const [key, value] of Object.entries(details)) {
    console.log(chalk.white(`│ ${key.padEnd(10)} : ${chalk.cyan(value)}`));
  }
  console.log(chalk.white('└──────────────────────────┘'));
  return new Promise(resolve => {
    rl.question(chalk.yellow('Confirm transaction? (y/n): '), answer => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function displayBanner(provider) {
  try {
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    const bannerText = `
${chalk.white('===============================================')}
${chalk.cyan('                TEA SEPOLIA AUTO BOT')}
${chalk.yellow('     Join Us: https://t.me/AirdropInsiderID ')}
${chalk.yellow(`        Block: ${blockNumber} | Gas: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei `)}
${chalk.white('===============================================')}
    `;
    console.log(bannerText);
  } catch (error) {
    console.error(chalk.red('Error fetching network status:', error.message, '❌'));
    const bannerText = `
${chalk.white('===============================================')}
${chalk.cyan('                TEA SEPOLIA AUTO BOT')}
${chalk.yellow('     Join Us: https://t.me/AirdropInsiderID ')}
${chalk.yellow('     Network status unavailable')}
${chalk.white('===============================================')}
    `;
    console.log(bannerText);
  }
}

async function connectToNetwork() {
  try {
    const proxies = await loadProxies();
    const proxy = getRandomProxy(proxies);
    const proxyUrl = parseProxy(proxy);

    let provider;
    if (proxyUrl) {
      const agent = new HttpsProxyAgent(proxyUrl);
      provider = new ethers.providers.JsonRpcProvider({
        url: network.rpc,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        agent
      });
    } else {
      provider = new ethers.providers.JsonRpcProvider(network.rpc);
    }

    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      console.error(chalk.red('Error: PRIVATE_KEY not found in .env file 🚫'));
      process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    return { provider, wallet, proxy };
  } catch (error) {
    console.error(chalk.red('Connection error:', error.message, '❌'));
    process.exit(1);
  }
}

async function getWalletInfo(wallet, provider, proxy) {
  const address = wallet.address;
  const teaBalance = await provider.getBalance(address);
  const stTeaContract = new ethers.Contract(
    stTeaContractAddress,
    ['function balanceOf(address owner) view returns (uint256)'],
    wallet
  );
  const stTeaBalance = await stTeaContract.balanceOf(address).catch(() => ethers.BigNumber.from(0));
  
  console.log(chalk.white('\n===== WALLET INFORMATION ====='));
  console.log(chalk.white(`Your address: ${chalk.cyan(address)} 👤`));
  console.log(chalk.white(`TEA Balance: ${chalk.cyan(ethers.utils.formatEther(teaBalance))} ${network.symbol} `));
  console.log(chalk.white(`stTEA Balance: ${chalk.cyan(ethers.utils.formatEther(stTeaBalance))} stTEA `));
  if (proxy) {
    console.log(chalk.white(`Using proxy: ${chalk.cyan(proxy)} 🌐`));
  } else {
    console.log(chalk.white(`Using proxy: ${chalk.cyan('None')} 🌐`));
  }
  console.log(chalk.white('=============================\n'));
}

async function stakeTea(wallet, amount) {
  try {
    const amountWei = ethers.utils.parseEther(amount.toString());
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 200000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));
    
    const confirmed = await confirmTransaction({
      Action: 'Stake',
      Amount: `${amount} TEA`,
      'Est. Gas': `${gasCost} TEA`
    });
    
    if (!confirmed) {
      console.log(chalk.red('Transaction canceled. 🚫'));
      console.log(chalk.white('===== STAKING CANCELED =====\n'));
      return null;
    }
    
    const stTeaContract = new ethers.Contract(
      stTeaContractAddress,
      stTeaABI,
      wallet
    );
    
    console.log(chalk.white('\n===== STAKING TEA ====='));
    console.log(chalk.yellow(`Staking ${amount} TEA...`));
    
    const tx = await stTeaContract.stake({
      value: amountWei,
      gasLimit: estimatedGas
    });
    
    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 📤`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));
    
    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();
    
    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    console.log(chalk.green(`Successfully staked ${amount} TEA! 🎉`));
    console.log(chalk.white('===== STAKING COMPLETED =====\n'));
    
    return receipt;
  } catch (error) {
    console.error(chalk.red('Error staking TEA:', error.message, '❌'));
    console.log(chalk.white('===== STAKING FAILED =====\n'));
    return null;
  }
}

async function withdrawTea(wallet, amount) {
  try {
    const amountWei = ethers.utils.parseEther(amount.toString());
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 100000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));
    
    const confirmed = await confirmTransaction({
      Action: 'Withdraw',
      Amount: `${amount} stTEA`,
      'Est. Gas': `${gasCost} TEA`
    });
    
    if (!confirmed) {
      console.log(chalk.red('Transaction canceled. 🚫'));
      console.log(chalk.white('===== WITHDRAW CANCELED =====\n'));
      return null;
    }
    
    const stTeaContract = new ethers.Contract(
      stTeaContractAddress,
      stTeaABI,
      wallet
    );
    
    console.log(chalk.white('\n===== WITHDRAWING TEA ====='));
    console.log(chalk.yellow(`Withdrawing ${amount} stTEA...`));
    
    const tx = await stTeaContract.withdraw(amountWei, {
      gasLimit: estimatedGas
    });
    
    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 📤`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));
    
    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();
    
    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    console.log(chalk.green(`Successfully withdrawn ${amount} stTEA! 🎉`));
    console.log(chalk.white('===== WITHDRAW COMPLETED =====\n'));
    
    return receipt;
  } catch (error) {
    console.error(chalk.red('Error withdrawing TEA:', error.message, '❌'));
    console.log(chalk.white('===== WITHDRAW FAILED =====\n'));
    return null;
  }
}

async function claimRewards(wallet) {
  try {
    console.log(chalk.white('\n===== CLAIMING REWARDS ====='));
    console.log(chalk.yellow('Claiming stTEA rewards...'));
    
    const data = "0x3d18b912";
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 100000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));
    
    const confirmed = await confirmTransaction({
      Action: 'Claim Rewards',
      'Est. Gas': `${gasCost} TEA`
    });
    
    if (!confirmed) {
      console.log(chalk.red('Transaction canceled. 🚫'));
      console.log(chalk.white('===== CLAIM CANCELED =====\n'));
      return null;
    }
    
    const tx = await wallet.sendTransaction({
      to: stTeaContractAddress,
      data: data,
      gasLimit: estimatedGas
    });
    
    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 📤`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));
    
    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();
    
    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    console.log(chalk.green('Successfully claimed rewards! 🎉'));
    console.log(chalk.white('===== CLAIMING COMPLETED =====\n'));
    
    const balance = await wallet.provider.getBalance(wallet.address);
    console.log(chalk.white(`Updated TEA Balance: ${chalk.cyan(ethers.utils.formatEther(balance))} ${network.symbol} 💰`));
    
    return receipt;
  } catch (error) {
    console.error(chalk.red('Error claiming rewards:', error.message, '❌'));
    console.log(chalk.white('===== CLAIMING FAILED =====\n'));
    return null;
  }
}

function generateRandomAddress() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.address;
}

// रैंडम अमाउंट जनरेट करने वाला फ़ंक्शन (0.0001 से 0.005 TEA के बीच)
function generateRandomAmount() {
  // 0.0001 (min) से 0.005 (max) के बीच एक रैंडम नंबर जनरेट करें
  const min = 0.0001;
  const max = 0.005;
  
  // ऐसा रैंडम नंबर जनरेट करें जो हर बार अलग हो
  const randomValue = min + (Math.random() * (max - min));
  
  // 8 डेसिमल प्लेसेज तक राउंड करें ताकि विविधता बनी रहे
  return parseFloat(randomValue.toFixed(8));
}

async function sendToRandomAddress(wallet, skipConfirmation = false) {
  try {
    // हर ट्रांज़ैक्शन के लिए एक नया रैंडम अमाउंट जनरेट करें
    const amount = generateRandomAmount();
    
    const toAddress = generateRandomAddress();
    const amountWei = ethers.utils.parseEther(amount.toString());
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 21000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));
    
    if (!skipConfirmation) {
      const confirmed = await confirmTransaction({
        Action: 'Transfer',
        Amount: `${amount} TEA`,
        To: toAddress.slice(0, 6) + '...' + toAddress.slice(-4),
        'Est. Gas': `${gasCost} TEA`
      });
      
      if (!confirmed) {
        console.log(chalk.red('Transaction canceled. 🚫'));
        return null;
      }
    }
    
    console.log(chalk.yellow(`Sending ${amount} TEA to random address: ${chalk.cyan(toAddress)} 📤`));
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: estimatedGas
    });
    
    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 🚀`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));
    
    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();
    
    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    
    return { receipt, toAddress, amount };
  } catch (error) {
    console.error(chalk.red('Error sending TEA:', error.message, '❌'));
    return null;
  }
}

async function executeRandomTransfers(wallet, numberOfTransfers) {
  try {
    console.log(chalk.white('\n===== RANDOM TRANSFERS ====='));
    console.log(chalk.yellow(`Starting ${numberOfTransfers} random transfers...`));
    
    let successCount = 0;
    let totalSent = 0;
    
    for (let i = 0; i < numberOfTransfers; i++) {
      console.log(chalk.white(`\n--- Transfer ${i + 1}/${numberOfTransfers} ---`));
      
      // रैंडम डिले जोड़ें ताकि सभी ट्रांज़ैक्शन एक साथ न हों
      const delayTime = 2000 + Math.floor(Math.random() * 3000); // 2-5 सेकंड का रैंडम डिले
      if (i > 0) {
        console.log(chalk.gray(`Waiting ${delayTime/1000} seconds before next transaction...`));
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
      
      // अब हम एक फिक्स्ड अमाउंट नहीं भेजेंगे, sendToRandomAddress फ़ंक्शन खुद ही रैंडम अमाउंट जनरेट करेगा
      const result = await sendToRandomAddress(wallet, true);
      
      if (result) {
        successCount++;
        totalSent += parseFloat(result.amount);
      }
    }
    
    console.log(chalk.white('\n===== TRANSFERS SUMMARY ====='));
    console.log(chalk.green(`Successfully completed ${successCount}/${numberOfTransfers} transfers ✅`));
    console.log(chalk.white(`Total amount sent: ${chalk.cyan(totalSent.toFixed(8))} TEA 💸`));
    console.log(chalk.white('===== TRANSFERS COMPLETED =====\n'));
    
    return successCount;
  } catch (error) {
    console.error(chalk.red('Error executing random transfers:', error.message, '❌'));
    console.log(chalk.white('===== TRANSFERS FAILED =====\n'));
    return 0;
  }
}

async function showMenu() {
  console.log(chalk.white('\n===== MENU ====='));
  console.log(chalk.white('1. Stake TEA'));
  console.log(chalk.white('2. Withdraw stTEA'));
  console.log(chalk.white('3. Claim Rewards'));
  console.log(chalk.white('4. Send To Random Address'));
  console.log(chalk.white('5. Execute Random Transfers'));
  console.log(chalk.white('6. Exit'));
  
  return new Promise(resolve => {
    rl.question(chalk.yellow('\nSelect an option (1-6): '), answer => {
      resolve(parseInt(answer.trim()));
    });
  });
}

async function main() {
  try {
    const { provider, wallet, proxy } = await connectToNetwork();
    await displayBanner(provider);
    await getWalletInfo(wallet, provider, proxy);
    
    while (true) {
      const choice = await showMenu();
      
      switch (choice) {
        case 1:
          rl.question(chalk.yellow('Enter amount to stake (TEA): '), async amount => {
            await stakeTea(wallet, amount.trim());
            await getWalletInfo(wallet, provider, proxy);
          });
          break;
        
        case 2:
          rl.question(chalk.yellow('Enter amount to withdraw (stTEA): '), async amount => {
            await withdrawTea(wallet, amount.trim());
            await getWalletInfo(wallet, provider, proxy);
          });
          break;
        
        case 3:
          await claimRewards(wallet);
          await getWalletInfo(wallet, provider, proxy);
          break;
        
        case 4:
          await sendToRandomAddress(wallet);
          await getWalletInfo(wallet, provider, proxy);
          break;
        
        case 5:
          rl.question(chalk.yellow('Enter number of transfers: '), async count => {
            await executeRandomTransfers(wallet, parseInt(count.trim()));
            await getWalletInfo(wallet, provider, proxy);
          });
          break;
        
        case 6:
          console.log(chalk.green('Exiting... Goodbye! 👋'));
          rl.close();
          process.exit(0);
          break;
        
        default:
          console.log(chalk.red('Invalid option. Please try again. ❌'));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:', error.message, '❌'));
    rl.close();
  }
}

main();
