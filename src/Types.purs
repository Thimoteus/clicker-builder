module Types where

import Prelude

import Control.Monad.Eff.Console (CONSOLE())

import Data.Array (take)
import Data.Generic (Generic, gShow)
import Data.Foreign.Class (IsForeign, readProp)

import Browser.WebStorage (WebStorage())
import Halogen (HalogenEffects())
import Unsafe.Coerce (unsafeCoerce)
import Util

type State = { currentClicks :: Clicks
             , totalClicks :: Clicks
             , cps :: ClicksPerSecond
             , burst :: Clicks
             , age :: Age
             , upgrades :: Upgrades
             }

newtype Clicks = Clicks Number
newtype ClicksPerSecond = ClicksPerSecond Number

instance eqClicks :: Eq Clicks where
  eq (Clicks m) (Clicks n) = m == n

instance eqClicksPerSecond :: Eq ClicksPerSecond where
  eq (ClicksPerSecond m) (ClicksPerSecond n) = m == n

instance ordClicks :: Ord Clicks where
  compare (Clicks m) (Clicks n) = compare m n

instance ordClicksPerSecond :: Ord ClicksPerSecond where
  compare (ClicksPerSecond m) (ClicksPerSecond n) = compare m n

instance semiringClicks :: Semiring Clicks where
  one = Clicks one
  zero = Clicks zero
  mul (Clicks m) (Clicks n) = Clicks (m * n)
  add (Clicks m) (Clicks n) = Clicks (m + n)

instance semiringClicksPerSecond :: Semiring ClicksPerSecond where
  one = ClicksPerSecond one
  zero = ClicksPerSecond zero
  mul (ClicksPerSecond m) (ClicksPerSecond n) = ClicksPerSecond (m * n)
  add (ClicksPerSecond m) (ClicksPerSecond n) = ClicksPerSecond (m + n)

instance ringClicks :: Ring Clicks where
  sub (Clicks m) (Clicks n) = Clicks (m - n)

instance ringClicksPerSecond :: Ring ClicksPerSecond where
  sub (ClicksPerSecond m) (ClicksPerSecond n) = ClicksPerSecond (m - n)

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

class Pretty a where
  prettify :: a -> String

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

instance prettyNumber :: Pretty Number where
  prettify n
    | sigFigs n <= 3 = oneDecimal n
    | sigFigs n <= 5 = noDecimal n
    | sigFigs n <= 6 = transformDigits (take 3) n ++ "k"
    | sigFigs n <= 7 = transformDigits (take 4) n ++ "k"
    | sigFigs n <= 8 = transformDigits (take 5) n ++ "k"
    | sigFigs n <= 9 = transformDigits (take 3) n ++ "m"
    | sigFigs n <= 10 = transformDigits (take 4) n ++ "m"
    | sigFigs n <= 11 = transformDigits (take 5) n ++ "m"
    | otherwise = "Your civilization can't count this high!"

instance prettyClicks :: Pretty Clicks where
  prettify (Clicks n) = prettify n ++ " c"

instance prettyClicksPerSecond :: Pretty ClicksPerSecond where
  prettify (ClicksPerSecond n) = prettify n ++ " cps"

instance prettyInt :: Pretty Int where
  prettify = show

instance prettyAge :: Pretty Age where
  prettify = show

class Serialize a where
  serialize :: a -> String

instance serializeString :: Serialize String where
  serialize = id

instance serializeInt :: Serialize Int where
  serialize = show

instance serializeNumber :: Serialize Number where
  serialize = prettify

instance serializeClicks :: Serialize Clicks where
  serialize (Clicks n) = prettify n

instance serializeClicksPerSecond :: Serialize ClicksPerSecond where
  serialize (ClicksPerSecond n) = prettify n

instance serializeAge :: Serialize Age where
  serialize = prettify

instance serializeUpgrade :: Serialize Upgrade where
  serialize (CPS1 n _) = serialize n
  serialize (CPS2 n _) = serialize n
  serialize (CPS3 n _) = serialize n
  serialize (CPS4 n _) = serialize n
  serialize (CPS5 n _) = serialize n
  serialize (Burst1 n _) = serialize n
  serialize (Burst2 n _) = serialize n
  serialize (Burst3 n _) = serialize n
  serialize (Burst4 n _) = serialize n
  serialize (Burst5 n _) = serialize n

instance serializeUpgrades :: Serialize Upgrades where
  serialize (Upgrades u) = """{ "cps1": """
    ++ serialize u.cps1 ++ """, "cps2": """
    ++ serialize u.cps2 ++ """, "cps3": """
    ++ serialize u.cps3 ++ """, "cps4": """
    ++ serialize u.cps4 ++ """, "cps5": """
    ++ serialize u.cps5 ++ """, "burst1": """
    ++ serialize u.burst1 ++ """, "burst2": """
    ++ serialize u.burst2 ++ """, "burst3": """
    ++ serialize u.burst3 ++ """, "burst4": """
    ++ serialize u.burst4 ++ """, "burst5": """
    ++ serialize u.burst5 ++ "}"

initialState :: State
initialState = { currentClicks: Clicks 0.0
               , totalClicks: Clicks 0.0
               , cps: ClicksPerSecond 0.0
               , age: Stone
               , burst: Clicks 1.0
               , upgrades: initialUpgrades
               }

initialUpgrades :: Upgrades
initialUpgrades = Upgrades { cps1: CPS1 0 tagCPS1
                           , cps2: CPS2 0 tagCPS2
                           , cps3: CPS3 0 tagCPS3
                           , cps4: CPS4 0 tagCPS4
                           , cps5: CPS5 0 tagCPS5
                           , burst1: Burst1 0 tagBurst1
                           , burst2: Burst2 0 tagBurst2
                           , burst3: Burst3 0 tagBurst3
                           , burst4: Burst4 0 tagBurst4
                           , burst5: Burst5 0 tagBurst5
                           }
