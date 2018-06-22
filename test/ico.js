var
    PrivateSale = artifacts.require("./PrivateSale.sol"),
    ICO = artifacts.require("./test/TestICO.sol"),
    Gig = artifacts.require("./GigToken.sol"),
    // SupplyBlocAllocation = artifacts.require("./SupplyBlocAllocation.sol"),

    Utils = require("./utils"),
    BigNumber = require('bignumber.js'),

    precision = new BigNumber("1000000000000000000"),
    usdPrecision = new BigNumber("100000"),
    icoSince = parseInt(new Date().getTime() / 1000 - 600),
    icoTill = parseInt(new Date().getTime() / 1000) + 3600,
    signAddress = web3.eth.accounts[0],
    etherHolder = web3.eth.accounts[5],
    wrongSigAddress = web3.eth.accounts[7]

var abi = require('ethereumjs-abi'),
    BN = require('bn.js');

function makeTransactionKYC(instance, sign, address, value) {
    'use strict';
    var h = abi.soliditySHA3(['address'], [new BN(address.substr(2), 16)]),
        sig = web3.eth.sign(sign, h.toString('hex')).slice(2),
        r = `0x${sig.slice(0, 64)}`,
        s = `0x${sig.slice(64, 128)}`,
        v = web3.toDecimal(sig.slice(128, 130)) + 27;

    var data = abi.simpleEncode('multivestBuy(address,uint8,bytes32,bytes32)', address, v, r, s);

    return instance.sendTransaction({value: value, from: address, data: data.toString('hex')});
}

async function deploy() {
    const allocations = '0x0';
    const token = await Gig.new(false);
    const ico = await ICO.new(
        token.address, //_token
        etherHolder, //_etherHolder
        new BigNumber('186972690455956902700799729').valueOf(),//_maxTokenSupply
        new BigNumber('62500000000000000000000000').valueOf(),//_maxTokenSupply
        24800,
        [icoSince, icoSince+700],//_startTime
        [icoSince+800, icoTill],//_endTime
        // [1530432000,1533081599],
        // [1533110400, 1538351999],
        150000000,
    );
    await token.addMinter(ico.address);
    await ico.setAllowedMultivest(signAddress);
    // await token.setCrowdSale(ico.address);

    return {token, ico, allocations};
}

contract('ICO', function (accounts) {

    it("deploy & check constructor info & setPreICO & setPrivateSale & updateTotalSupplyAndCollectedUsd", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);
        await token.addMinter(ico.address);
        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            },
            token: {
                balanceOf: [
                    {[accounts[0]]: 0},
                ],
            }
        });

        //setTokenContract
        await ico.setTokenContract(accounts[2], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await ico.setTokenContract(accounts[2])
            .then(Utils.receiptShouldSucceed);

        await ico.setEtherHolder(accounts[3], {from: accounts[1]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await ico.setEtherHolder(accounts[3])
            .then(Utils.receiptShouldSucceed);
        await ico.setEtherHolder(0x0);

        await Utils.checkState({ico, token}, {
            ico: {
                token: accounts[2],
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: accounts[3],
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
    });

    it("check ", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('0').mul(precision).valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('0').mul(precision).valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        let preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('0').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('0').valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('0').valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");


        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        console.log('---', await ico.getActiveTier.call());
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");


        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-65)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        let zal = await ico.calculateTokensAmount(new BigNumber('1').mul(precision).valueOf());
        console.log(zal[0]);
        assert.equal(await ico.getActiveTier.call(), 0, "getActiveTier is not equal");
        await Utils.checkState({ico, token}, {
            token: {
                //17281105990783410138248
                totalSupply: new BigNumber('17281105990783410138248').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('17281105990783410138248').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('17281105990783410138248').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('1500').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('1').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 1, "getActiveTier is not equal");

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-60)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('0').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('100').valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('17281105990783410138248').add('15120967741935483870967').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('32402073732718894009215').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('32402073732718894009215').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('3000').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('2').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 5, "getActiveTier is not equal");

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-25)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('32402073732718894009215').add('8064516129032258064516').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('40466589861751152073731').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: new BigNumber('8064516129032258064516').valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('1').mul(precision).valueOf()},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        preICOStats = await ico.getPreICOStats.call();
        assert.equal(preICOStats[0], new BigNumber('32402073732718894009215').valueOf(), "soldTokens is not equal");
        assert.equal(preICOStats[1], new BigNumber('3000').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        assert.equal(preICOStats[2], new BigNumber('2').mul(precision).valueOf(), "collectedEthers is not equal");
        assert.equal(preICOStats[3], false, "burned is not equal");

    });

    it("check calculateTokensAmount ", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);
        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        // 100*150000000/10^18
        let zal = await ico.calculateTokensAmount.call(100);
        assert.equal(zal[0], 0, 'calculateTokensAmount is not equal');
        assert.equal(zal[1], 0, 'calculateTokensAmount is not equal');
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-65)/100))
        zal = await ico.calculateTokensAmount.call(new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(zal[0], new BigNumber('17281105990783410138248').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600));
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-60)/100))
        zal = await ico.calculateTokensAmount.call(new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('15120967741935483870967').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 24));
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 2, "getActiveTier is not equal");
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-57)/100))
        zal = await ico.calculateTokensAmount.call(new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('14066016504126031507876').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 2 * 24));
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-55)/100))
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 3, "getActiveTier is not equal");
        zal = await ico.calculateTokensAmount.call(await new BigNumber(web3.toWei('1', 'ether')));
        // assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('13440860215053763440860').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');

        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 3 * 24));
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-50)/100))
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 4, "getActiveTier is not equal");
        zal = await ico.calculateTokensAmount.call(await new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('12096774193548387096774').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');

        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 3 * 24));
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-25)/100))
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 5, "getActiveTier is not equal");
        zal = await ico.calculateTokensAmount.call(await new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('8064516129032258064516').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(6, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 3 * 24));
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-15)/100))
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 6, "getActiveTier is not equal");
        zal = await ico.calculateTokensAmount.call(await new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('7115749525616698292220').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
        await ico.changeICODates(6, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(7, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 3 * 24));
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-10)/100))
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 7, "getActiveTier is not equal");
        zal = await ico.calculateTokensAmount.call(await new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('6720430107526881720430').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
        await ico.changeICODates(7, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(8, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600 * 3 * 24));
//((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-5)/100))
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 8, "getActiveTier is not equal");
        zal = await ico.calculateTokensAmount.call(await new BigNumber(web3.toWei('1', 'ether')));
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('6366723259762308998302').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 150000000, 'USDAmount is not equal');
     });


    it("check burnTokens", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);
        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(new BigNumber(await ico.getActiveTier.call()).valueOf(), 5, "getActiveTier is not equal");

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-25)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('8064516129032258064516').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('8064516129032258064516').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: new BigNumber('8064516129032258064516').valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('1').mul(precision).valueOf()},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 2 * 3600, parseInt(new Date().getTime() / 1000) - 3600)
        await token.setCrowdSale(ico.address);
        await ico.burnUnsoldTokens();
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('8064516129032258064516').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('8064516129032258064516').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('8064516129032258064516').valueOf(),
                soldTokens: new BigNumber('8064516129032258064516').valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('1').mul(precision).valueOf()},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

    });

    it("check ico period & colecting USD", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);

        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000) - 3600 * 2, parseInt(new Date().getTime() / 1000) - 3600);
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isActive.call(), true, "isActive is not equal");
        assert.equal(await ico.getActiveTier.call(), 5, "getActiveTier is not equal");

        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-25)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('8064516129032258064516').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('8064516129032258064516').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: new BigNumber('8064516129032258064516').valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('1').mul(precision).valueOf()},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        assert.equal(await ico.isRefundPossible.call(), false, "RefundPossible is not equal");
        await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 2 * 3600, parseInt(new Date().getTime() / 1000) - 3600)
        assert.equal(await ico.isActive.call(), false, "isActive is not equal");
        const ico2 = await ICO.new(
            token.address, //_token
            etherHolder, //_etherHolder
            new BigNumber('186972690455956902700799729').valueOf(),//_maxTokenSupply
            new BigNumber('62500000000000000000000000').valueOf(),//_maxTokenSupply
            24800,
            [icoSince, icoTill],//_startTime
            [icoTill+300, icoTill+8000],//_endTime
            125000000,
        );
        await token.setCrowdSale(ico2.address);
        await ico.refund.call({from: accounts[3]})
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
        await token.setCrowdSale(ico.address);
        assert.equal(await ico.isRefundPossible.call(), true, "RefundPossible is not equal");
        assert.equal(await ico.refund.call({from: accounts[3]}), true, 'refund is not equal');
        await ico.refund({from: accounts[3]})
            .then(Utils.receiptShouldSucceed);
        assert.equal(await ico.refund.call({from: accounts[3]}), false, 'refund is not equal');
        await ico.refund({from: accounts[3]})
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('0').valueOf(),
                balanceOf: [
                    {[accounts[3]]: new BigNumber('0').valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: new BigNumber('8064516129032258064516').valueOf(),
                collectedEthers: new BigNumber('1').mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber('1500').mul(usdPrecision).valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[3]]: new BigNumber('0').mul(precision).valueOf()},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

    });
    it("check try to contrubute after sale period", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);
        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });
        await ico.testChangeICOPeriod(parseInt(new Date().getTime() / 1000) - 2 * 3600, parseInt(new Date().getTime() / 1000) - 3600)
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-25)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldFailed)
            .catch(Utils.catchReceiptShouldFailed);
    });

    it("check collected USD", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);

        let etherHolderBalance = await Utils.getEtherBalance(etherHolder)

        let start = parseInt(new Date().getTime() / 1000 - 3600 * 2);
        await ico.changeICODates(0, start, parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(2, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(3, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-50)/100))

        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await Utils.checkEtherBalance(etherHolder, new BigNumber("1").mul(precision).add(etherHolderBalance).valueOf())
        await ico.changeICODates(4, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(5, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(6, parseInt(new Date().getTime() / 1000) - 3600, parseInt(new Date().getTime() / 1000) - 3600 + 3600 * 24);
        assert.equal(await ico.isRefundPossible.call(), false, "RefundPossible is not equal");
        //((10 ^ 18) * (1500 * 10 ^ 5) / (0.2480 * 10 ^ 5*(100-15)/100))
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);

        await Utils.checkEtherBalance(etherHolder, new BigNumber("1").mul(precision).add(etherHolderBalance).valueOf())
        await ico.testChangeCollectedUSD(new BigNumber('2500000').mul(usdPrecision))
        assert.equal(new BigNumber(await ico.collectedUSD.call()).valueOf(), new BigNumber('2500000').mul(usdPrecision).valueOf(), "collectedUSD is not equal");
        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
        await Utils.checkEtherBalance(etherHolder, new BigNumber("3").mul(precision).add(etherHolderBalance).valueOf())

        await makeTransactionKYC(ico, signAddress, accounts[3], new BigNumber('1').mul(precision).valueOf())
            .then(Utils.receiptShouldSucceed);
        await Utils.checkState({ico, token}, {
            token: {
                totalSupply: new BigNumber('12096774193548387096774').add("7115749525616698292220").add("7115749525616698292220").add("7115749525616698292220").valueOf(),
                balanceOf: [
                    {[accounts[3]]:  new BigNumber('12096774193548387096774').add("7115749525616698292220").add("7115749525616698292220").add("7115749525616698292220").valueOf()},
                ],
            },
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                startTime: start,
                endTime: icoTill,
                soldTokens: new BigNumber("7115749525616698292220").add("7115749525616698292220").add("7115749525616698292220").valueOf(),
                collectedEthers: new BigNumber("3").mul(precision).valueOf(),
                etherHolder: etherHolder,
                collectedUSD: new BigNumber("250300000000").valueOf(),
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                    {[accounts[3]]: new BigNumber("3").mul(precision).valueOf()},
                ],
                icoBalances:[
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                    {[accounts[3]]: new BigNumber("7115749525616698292220").add("7115749525616698292220").add("7115749525616698292220").valueOf()},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        await Utils.checkEtherBalance(etherHolder, new BigNumber("4").mul(precision).add(etherHolderBalance).valueOf())
    });

    it("check calculateEthersAmount ", async function () {
        const {token, ico, allocations} = await deploy();
        await token.setCrowdSale(ico.address);
        await Utils.checkState({ico, token}, {
            ico: {
                token: token.address,
                minPurchase: new BigNumber('10000000').valueOf(),
                maxPurchase: new BigNumber('0').mul(precision).valueOf(),
                softCap: new BigNumber('2500000').mul(usdPrecision).valueOf(),
                hardCap: new BigNumber('35789128').mul(usdPrecision).valueOf(),
                maxTokenSupply: new BigNumber('249472690455956902700799729').valueOf(),
                startTime: icoSince,
                endTime: icoTill,
                soldTokens: 0,
                collectedEthers: 0,
                etherHolder: etherHolder,
                collectedUSD: 0,
                etherBalances: [
                    {[accounts[0]]: 0},
                    {[accounts[1]]: 0},
                ],
                allowedMultivests: [
                    {[accounts[0]]: true},
                    {[accounts[1]]: false},
                ],
            }
        });

        let zal = await ico.calculateEthersAmount.call(0);
        assert.equal(zal[0], 0, 'calculateEthersAmount is not equal');
        assert.equal(zal[1], 0, 'calculateEthersAmount is not equal');
        // (17281105990783410138248* (0.2480 * 10 ^ 5*(100-65)/100))/1500*10^5
        zal = await ico.calculateEthersAmount.call(new BigNumber('17281105990783410138248').valueOf());
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('999999999999999999').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 149999999, 'USDAmount is not equal');


        await ico.changeICODates(0, parseInt(new Date().getTime() / 1000 - 3600 * 2), parseInt(new Date().getTime() / 1000 - 3600));
        await ico.changeICODates(1, parseInt(new Date().getTime() / 1000 - 3600), parseInt(new Date().getTime() / 1000 + 3600));
        // (15120967741935483870967* (0.2480 * 10 ^ 5*(100-60)/100))/1500*10^5
        zal = await ico.calculateEthersAmount.call(new BigNumber('15120967741935483870967').valueOf());
        assert.equal(new BigNumber(zal[0]).valueOf(), new BigNumber('999999999999999999').valueOf(), 'TokensAmount is not equal');
        assert.equal(new BigNumber(zal[1]).valueOf(), 149999999, 'USDAmount is not equal');
    });
});
