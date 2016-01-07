module Lenses where

import Prelude
import Data.Lens (GetterP(), LensP(), lens, to, (^.))
import Types

clicks :: LensP Clicks Number
clicks = lens (\ (Clicks n) -> n) (\ _ m -> Clicks m)

clicksPerSecond :: LensP ClicksPerSecond Number
clicksPerSecond = lens (\ (ClicksPerSecond n) -> n) (\ _ m -> ClicksPerSecond m)

currentClicks :: LensP State Clicks
currentClicks = lens _.currentClicks (_ { currentClicks = _ })

currentClicksNumber :: LensP State Number
currentClicksNumber = currentClicks <<< clicks

totalClicks :: LensP State Clicks
totalClicks = lens _.totalClicks (_ { totalClicks = _ })

totalClicksNumber :: LensP State Number
totalClicksNumber = totalClicks <<< clicks

cps :: LensP State ClicksPerSecond
cps = lens _.cps (_ { cps = _ })

cpsNumber :: LensP State Number
cpsNumber = cps <<< clicksPerSecond

burst :: LensP State Clicks
burst = lens _.burst (_ { burst = _ })

burstNumber :: LensP State Number
burstNumber = burst <<< clicks

age :: LensP State Age
age = lens _.age (_ { age = _ })

upgrades :: LensP State Upgrades
upgrades = lens _.upgrades (_ { upgrades = _ })

runUpgrades (Upgrades u) = u

cps1 :: LensP Upgrades Upgrade
cps1 = lens (_.cps1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { cps1 = v }))

cps2 :: LensP Upgrades Upgrade
cps2 = lens (_.cps2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { cps2 = v }))

cps3 :: LensP Upgrades Upgrade
cps3 = lens (_.cps3 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { cps3 = v }))

cps4 :: LensP Upgrades Upgrade
cps4 = lens (_.cps4 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { cps4 = v }))

cps5 :: LensP Upgrades Upgrade
cps5 = lens (_.cps5 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { cps5 = v }))

burst1 :: LensP Upgrades Upgrade
burst1 = lens (_.burst1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { burst1 = v }))

burst2 :: LensP Upgrades Upgrade
burst2 = lens (_.burst2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { burst2 = v }))

burst3 :: LensP Upgrades Upgrade
burst3 = lens (_.burst3 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { burst3 = v }))

burst4 :: LensP Upgrades Upgrade
burst4 = lens (_.burst4 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { burst4 = v }))

burst5 :: LensP Upgrades Upgrade
burst5 = lens (_.burst5 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { burst5 = v }))

cps1level :: GetterP Upgrade Int
cps1level = to (\ (CPS1 n _) -> n)

cps2level :: GetterP Upgrade Int
cps2level = to (\ (CPS2 n _) -> n)

cps3level :: GetterP Upgrade Int
cps3level = to (\ (CPS3 n _) -> n)

cps4level :: GetterP Upgrade Int
cps4level = to (\ (CPS4 n _) -> n)

cps5level :: GetterP Upgrade Int
cps5level = to (\ (CPS5 n _) -> n)

burst1level :: GetterP Upgrade Int
burst1level = to (\ (Burst1 n _) -> n)

burst2level :: GetterP Upgrade Int
burst2level = to (\ (Burst2 n _) -> n)

burst3level :: GetterP Upgrade Int
burst3level = to (\ (Burst3 n _) -> n)

burst4level :: GetterP Upgrade Int
burst4level = to (\ (Burst4 n _) -> n)

burst5level :: GetterP Upgrade Int
burst5level = to (\ (Burst5 n _) -> n)

viewUpgradeLevel :: LensP Upgrades Upgrade -> GetterP Upgrade Int
viewUpgradeLevel cpsn = case initialState ^. upgrades <<< cpsn of
                             CPS1 _ _ -> cps1level
                             CPS2 _ _ -> cps2level
                             CPS3 _ _ -> cps3level
                             CPS4 _ _ -> cps4level
                             CPS5 _ _ -> cps5level
                             Burst1 _ _ -> burst1level
                             Burst2 _ _ -> burst2level
                             Burst3 _ _ -> burst3level
                             Burst4 _ _ -> burst4level
                             Burst5 _ _ -> burst5level

