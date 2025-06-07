from algopy import *
from algopy.arc4 import abimethod

class NFTMarketplaceContract(ARC4Contract):
    asset_id : UInt64
    price : UInt64
    holder : Account
    
    @abimethod(allow_actions=["NoOp"], create="require")
    def create_marketplace_application(self, asset_id: Asset, price: UInt64) -> None:
        self.holder = Txn.sender
        self.assetid = asset_id.id
        self.price = price
    
    @abimethod()
    def opt_in_to_asset(self, mbrpay: gtxn.PaymentTransaction) -> None:
        assert Txn.sender == Global.creator_address
        assert not Global.current_application_address.is_opted_in(Asset(self.assetid))

        assert mbrpay.receiver == Global.current_application_address

        assert mbrpay.amount == Global.min_balance + Global.asset_opt_in_min_balance

        itxn.AssetTransfer(
            xfer_asset= self.assetid,
            asset_receiver= Global.current_application_address,
            asset_amount= 0,
            fee=0,
        ).submit()
    
    @abimethod()
    def set_price(self, price: UInt64) -> None:
        assert Txn.sender == self.holder
        self.price = price


    @abimethod()
    def buy(self, buyerTxn: gtxn.PaymentTransaction ) -> None:
        assert buyerTxn.sender == Txn.sender
        assert buyerTxn.receiver == self.holder
        assert buyerTxn.amount == self.price

        itxn.AssetTransfer(
            sender = Global.current_application_address,
            xfer_asset= self.assetid,
            asset_receiver= Txn.sender,
            asset_amount= 1,
        ).submit()
        self.holder = Txn.sender
    
    @abimethod(allow_actions=["DeleteApplication"])
    def delete_application(self) -> None:
        assert Txn.sender == self.holder

        itxn.AssetTransfer(
            xfer_asset=self.assetid,
            asset_receiver=self.holder,
            asset_amount=0,
            asset_close_to=self.holder,
            fee=1_000,
        ).submit()
