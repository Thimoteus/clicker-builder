module Types where

import Prelude

import Control.Monad.Eff.Console (CONSOLE())

import Data.Array (span, take)
import Data.String (toCharArray, fromCharArray)
import Data.Generic (Generic, gShow)
import Data.Lens (LensP(), lens)
import Data.Foreign.Class (IsForeign, readProp)

import Browser.WebStorage (WebStorage())
import Halogen (HalogenEffects())
import Unsafe.Coerce (unsafeCoerce)

type State = { clicks :: Clicks
             , total :: Clicks
             , cps :: ClicksPerSecond
             , burst :: Clicks
             , age :: Age
             , upgrades :: Upgrades
             }

type Clicks = Number
type ClicksPerSecond = Number

clicks :: LensP State Clicks
clicks = lens _.clicks (_ { clicks = _ })

total :: LensP State Clicks
total = lens _.total (_ { total = _ })

cps :: LensP State ClicksPerSecond
cps = lens _.cps (_ { cps = _ })

burst :: LensP State Clicks
burst = lens _.burst (_ { burst = _ })

age :: LensP State Age
age = lens _.age (_ { age = _ })

upgrades :: LensP State Upgrades
upgrades = lens _.upgrades (_ { upgrades = _ })

type AppEffects = HalogenEffects ( webStorage :: WebStorage, console :: CONSOLE )

data Action a = Click a
              | Autoclick a
              | Reset a
              | Save a
              | Buy Upgrade a

data Upgrade = CPS1 Int TagCPS1
             | CPS2 Int TagCPS2
             | CPS3 Int TagCPS3
             | CPS4 Int TagCPS4
             | CPS5 Int TagCPS5
             -- burst upgrades
             | Burst1 Int TagBurst1
             | Burst2 Int TagBurst2
             | Burst3 Int TagBurst3
             | Burst4 Int TagBurst4
             | Burst5 Int TagBurst5

data TagCPS1
data TagCPS2
data TagCPS3
data TagCPS4
data TagCPS5
data TagBurst1
data TagBurst2
data TagBurst3
data TagBurst4
data TagBurst5

tagCPS1 :: TagCPS1
tagCPS1 = unsafeCoerce unit

tagCPS2 :: TagCPS2
tagCPS2 = unsafeCoerce unit

tagCPS3 :: TagCPS3
tagCPS3 = unsafeCoerce unit

tagCPS4 :: TagCPS4
tagCPS4 = unsafeCoerce unit

tagCPS5 :: TagCPS5
tagCPS5 = unsafeCoerce unit

tagBurst1 :: TagBurst1
tagBurst1 = unsafeCoerce unit

tagBurst2 :: TagBurst2
tagBurst2 = unsafeCoerce unit

tagBurst3 :: TagBurst3
tagBurst3 = unsafeCoerce unit

tagBurst4 :: TagBurst4
tagBurst4 = unsafeCoerce unit

tagBurst5 :: TagBurst5
tagBurst5 = unsafeCoerce unit

newtype Upgrades = Upgrades { cps1 :: Upgrade
                            , cps2 :: Upgrade
                            , cps3 :: Upgrade
                            , cps4 :: Upgrade
                            , cps5 :: Upgrade
                            , burst1 :: Upgrade
                            , burst2 :: Upgrade
                            , burst3 :: Upgrade
                            , burst4 :: Upgrade
                            , burst5 :: Upgrade
                            }

instance isForeignUpgrades :: IsForeign Upgrades where
  read value = do
    _cps1 <- readProp "cps1" value
    _cps2 <- readProp "cps2" value
    _cps3 <- readProp "cps3" value
    _cps4 <- readProp "cps4" value
    _cps5 <- readProp "cps5" value
    _burst1 <- readProp "burst1" value
    _burst2 <- readProp "burst2" value
    _burst3 <- readProp "burst3" value
    _burst4 <- readProp "burst4" value
    _burst5 <- readProp "burst5" value
    pure $ Upgrades { cps1: CPS1 _cps1 tagCPS1
                    , cps2: CPS2 _cps2 tagCPS2
                    , cps3: CPS3 _cps3 tagCPS3
                    , cps4: CPS4 _cps4 tagCPS4
                    , cps5: CPS5 _cps5 tagCPS5
                    , burst1: Burst1 _burst1 tagBurst1
                    , burst2: Burst2 _burst2 tagBurst2
                    , burst3: Burst3 _burst3 tagBurst3
                    , burst4: Burst4 _burst4 tagBurst4
                    , burst5: Burst5 _burst5 tagBurst5
                    }

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

data Age = Stone
         | Bronze
         | Iron
         | Classical
         | Dark
         | Medieval
         | Renaissance
         | Imperial
         | Industrial
         | Nuclear
         | Information
         | Global
         | Space
         | Solar

derive instance genericAge :: Generic Age

instance ageShow :: Show Age where
  show = gShow

instance prettifyUpgrade :: Pretty Upgrade where
  prettify (CPS1 n _) = prettify n
  prettify (CPS2 n _) = prettify n
  prettify (CPS3 n _) = prettify n
  prettify (CPS4 n _) = prettify n
  prettify (CPS5 n _) = prettify n
  prettify (Burst1 n _) = prettify n
  prettify (Burst2 n _) = prettify n
  prettify (Burst3 n _) = prettify n
  prettify (Burst4 n _) = prettify n
  prettify (Burst5 n _) = prettify n

class Pretty a where
  prettify :: a -> String

instance prettyNumber :: Pretty Number where
  prettify = show >>> toCharArray >>> chopDigits >>> fromCharArray
    where
      chopDigits :: Array Char -> Array Char
      chopDigits arr = let split = span (/= '.') arr
                           large = split.init
                           small = take 2 $ split.rest
                        in large ++ small

instance prettyInt :: Pretty Int where
  prettify = show

instance prettyAge :: Pretty Age where
  prettify = show

instance prettyUpgrades :: Pretty Upgrades where
  prettify (Upgrades u) = "{ cps1: "
                       ++ prettify u.cps1 ++ ", cps2: "
                       ++ prettify u.cps2 ++ ", cps3: "
                       ++ prettify u.cps3 ++ ", cps4: "
                       ++ prettify u.cps4 ++ ", cps5: "
                       ++ prettify u.cps5 ++ ", burst1: "
                       ++ prettify u.burst1 ++ ", burst2: "
                       ++ prettify u.burst2 ++ ", burst3: "
                       ++ prettify u.burst3 ++ ", burst4: "
                       ++ prettify u.burst4 ++ ", burst5: "
                       ++ prettify u.burst5 ++ "}"
