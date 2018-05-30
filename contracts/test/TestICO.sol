pragma solidity ^0.4.18;


import '../CrowdSale.sol';


contract TestICO is CrowdSale {

    function TestICO(
        address _token,
        address _etherHolder,
        uint256 _maxPreICOTokenSupply,  //248500000000000000000000000
        uint256 _maxICOTokenSupply, //87500000000000000000000000
        uint256 _price,
        uint256[2] _preIcoDuration, //1530432000  -1533081599
        uint256[2] _icoDuration, // 1533110400 - 1538351999
        uint256 _etherPriceInUSD
    ) public CrowdSale(
        _token,
        _etherHolder,
        _maxPreICOTokenSupply,
        _maxICOTokenSupply,
        _price,
         _preIcoDuration, //1530432000  -1533081599
         _icoDuration, // 1533110400 - 1538351999
        _etherPriceInUSD
    ) {}

    function testChangeICOPeriod(uint256 _start, uint256 _end) public {
        for (uint8 i = 0; i < tiers.length; i++) {
            tiers[i].startTime = _start;
            tiers[i].endTime = _end;
        }

        startTime = _start;
        endTime = _end;
    }

    function testChangeSoldTokens(uint256 _sold) public {
        soldTokens = _sold;
    }

    function testChangeCollectedUSD(uint256 _amount) public {
        collectedUSD = _amount;
    }

    function getPreICOStats() public view returns (
        uint256,
        uint256,
        uint256,
        bool
    ) {
        return (
            preICOStats.soldTokens,
            preICOStats.collectedUSD,
            preICOStats.collectedEthers,
            preICOStats.burned
        );
    }

}
