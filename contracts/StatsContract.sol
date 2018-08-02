pragma solidity 0.4.19;

import './CrowdSale.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';


contract StatsContract {

    using SafeMath for uint256;

    CrowdSale public crowdsale;

    function StatsContract(CrowdSale _crowdsale) public {
        crowdsale = CrowdSale(_crowdsale);
    }

    //uint256 sold,
    //uint256 maxSupply,
    //uint256 min,
    //uint256 soft,
    //uint256 hard,
    //uint256 tokensPerUSD,
    //uint256 tokensPerEth,
    //uint256 tokensPerBtc,
    function getStats(uint256 _ethPerBtc) public view returns (
        uint256[2] period,
        uint256[8] stats,
        uint256[2] actualTier,
        uint256[27] tiersData
    ) {
        period[0] = crowdsale.startTime();
        period[1] = crowdsale.endTime();
        uint256[4] memory preICOStats;
        bool preICOburned;
        (preICOStats[0], preICOStats[1], preICOStats[2], preICOStats[3], preICOburned) = crowdsale.preICOStats();

        //sold tokens
        stats[0] = crowdsale.soldTokens().add(preICOStats[0]);

        //maxSupply
        stats[1] = crowdsale.maxTokenSupply().sub(preICOStats[1]);
        //min
        stats[2] = crowdsale.minPurchase();
        //soft
        stats[3] = crowdsale.softCap();
        //hardCap
        stats[4] = crowdsale.hardCap();
        //tokensPerUSD
        stats[5] = uint256(1e18).mul(1e5).div(crowdsale.price());
        uint256 j;
        //        //tokensPerEth
        (stats[6], j) = calculateTokensAmount(1 ether);
        //        //tokensPerBtc
        (stats[7], j) = calculateTokensAmount(_ethPerBtc);

        j = 0;
        for (uint256 i = 0; i <= crowdsale.ICO_TIER_LAST(); i++) {
            (tiersData[j++], tiersData[j++], tiersData[j++]) = crowdsale.tiers(i);
        }
        actualTier[0] = crowdsale.getActiveTier();
        actualTier[1] = actualTier[0];
        if (actualTier[0] > crowdsale.ICO_TIER_LAST() && block.timestamp < period[1]) {
            uint256 tierElements = tiersData.length.div(3);
            for (i = 0; i < tierElements; i++) {
                if (
                    block.timestamp < tiersData[i.mul(3).add(1)]
                ) {
                    actualTier[1] = i;
                    break;
                }
            }
        }
    }

    function calculateTokensAmount(uint256 _value) public view returns (uint256 tokenAmount, uint256 usdAmount) {
        if (_value == 0) {
            return (0, 0);
        }
        uint256 activeTier = crowdsale.getActiveTier();
        uint256[27] memory tiersData;
        if (activeTier > crowdsale.ICO_TIER_LAST()) {
            if (crowdsale.endTime() < block.timestamp) {
                return (0, 0);
            }
            if (crowdsale.startTime() > block.timestamp) {
                activeTier = crowdsale.PRE_ICO_TIER_FIRST();
            }
            if (block.timestamp < crowdsale.endTime()) {
                uint256 j = 0;
                for (uint256 i = 0; i <= crowdsale.ICO_TIER_LAST(); i++) {
                    (tiersData[j++], tiersData[j++], tiersData[j++]) = crowdsale.tiers(i);
                }
                uint256 tierElements = tiersData.length.div(3);
                for (i = 0; i < tierElements; i++) {
                    if (
                        block.timestamp < tiersData[i.mul(3).add(1)]
                    ) {
                        activeTier = i;
                        break;
                    }
                }
                usdAmount = _value.mul(crowdsale.etherPriceInUSD());

                tokenAmount = usdAmount.div(crowdsale.price() * (100 - tiersData[activeTier.mul(3)]) / 100);

                usdAmount = usdAmount.div(uint256(10) ** 18);

                if (usdAmount < crowdsale.minPurchase()) {
                    return (0, 0);
                }
                return (tokenAmount, usdAmount);
            }
        }

        return crowdsale.calculateTokensAmount(_value);
    }
}
