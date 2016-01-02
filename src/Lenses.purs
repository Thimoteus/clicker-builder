module Lenses where

import Prelude
import Data.Lens (LensP(), lens)
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

