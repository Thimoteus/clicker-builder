module Types where

import Prelude

import Control.Monad.Eff.Console (CONSOLE())
import Control.Monad.Eff.Random (RANDOM())

import Data.Array (take)
import Data.Foreign.Class (IsForeign, readProp)
import Data.Date (Now())
import Data.Time (Milliseconds(..))

import Browser.WebStorage (WebStorage())
import Halogen (HalogenEffects())
import Unsafe.Coerce (unsafeCoerce)
import Util

data Action a = Click a
              | Autoclick a
              | Reset a
              | Save a
              | Buy Upgrade a
              | Suffer Disaster a
              | Unmessage a
              | View Tab a

type State = { currentClicks :: Clicks
             , totalClicks :: Clicks
             , cps :: ClicksPerSecond
             , burst :: Clicks
             , age :: Age
             , upgrades :: Upgrades
             , message :: String
             , now :: Milliseconds
             , view :: Tab
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

type AppEffects = HalogenEffects ( webStorage :: WebStorage
                                 , console :: CONSOLE
                                 , now :: Now
                                 , random :: RANDOM )

newtype Population = Population Number

instance prettyPopulation :: Pretty Population where
  prettify (Population n) = prettify n ++ " Clickonians"

data Disaster = Disaster1 TagDisaster1
              | Disaster2 TagDisaster2
              | Disaster3 TagDisaster3
              | Disaster4 TagDisaster4
              | Disaster5 TagDisaster5
              | NoDisaster

data TagDisaster1
data TagDisaster2
data TagDisaster3
data TagDisaster4
data TagDisaster5

tagDisaster1 :: TagDisaster1
tagDisaster1 = unsafeCoerce unit

tagDisaster2 :: TagDisaster2
tagDisaster2 = unsafeCoerce unit

tagDisaster3 :: TagDisaster3
tagDisaster3 = unsafeCoerce unit

tagDisaster4 :: TagDisaster4
tagDisaster4 = unsafeCoerce unit

tagDisaster5 :: TagDisaster5
tagDisaster5 = unsafeCoerce unit

data Tab = UpgradesTab
         | HeroesTab
         | TechTreeTab
         | AdvanceTab

instance showView :: Show Tab where
  show UpgradesTab = "Upgrades"
  show HeroesTab = "Heroes"
  show TechTreeTab = "Tech Tree"
  show AdvanceTab = "Advance"

data Upgrade = Misc1 Int
             | Misc2 Int
             | Tech1 Int
             | Tech2 Int
             | Phil1 Int
             | Phil2 Int
             | Poli1 Int
             | Poli2 Int
             | Science1 Int
             | Science2 Int

newtype Upgrades = Upgrades { misc1 :: Upgrade
                            , misc2 :: Upgrade
                            , tech1 :: Upgrade
                            , tech2 :: Upgrade
                            , phil1 :: Upgrade
                            , phil2 :: Upgrade
                            , poli1 :: Upgrade
                            , poli2 :: Upgrade
                            , science1 :: Upgrade
                            , science2 :: Upgrade
                            }

instance isForeignUpgrades :: IsForeign Upgrades where
  read value = do
    _misc1 <- readProp "misc1" value
    _misc2 <- readProp "misc2" value
    _tech1 <- readProp "tech1" value
    _tech2 <- readProp "tech2" value
    _phil1 <- readProp "phil1" value
    _phil2 <- readProp "phil2" value
    _poli1 <- readProp "poli1" value
    _poli2 <- readProp "poli2" value
    _science1 <- readProp "science1" value
    _science2 <- readProp "science2" value
    pure $ Upgrades { misc1: Misc1 _misc1
                    , misc2: Misc2 _misc2
                    , tech1: Tech1 _tech1
                    , tech2: Tech2 _tech2
                    , phil1: Phil1 _phil1
                    , phil2: Phil2 _phil2
                    , poli1: Poli1 _poli1
                    , poli2: Poli2 _poli2
                    , science1: Science1 _science1
                    , science2: Science2 _science2
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

instance ageShow :: Show Age where
  show Stone = "Stone"
  show Bronze = "Bronze"
  show Iron = "Iron"
  show Classical = "Classical"
  show Dark = "Dark"
  show Medieval = "Medieval"
  show Renaissance = "Renaissance"
  show Imperial = "Imperial"
  show Industrial = "Industrial"
  show Nuclear = "Nuclear"
  show Information = "Information"
  show Global = "Global"
  show Space = "Space"
  show Solar = "Solar"

class Pretty a where
  prettify :: a -> String

instance prettifyUpgrade :: Pretty Upgrade where
  prettify (Misc1 n) = prettify n
  prettify (Misc2 n) = prettify n
  prettify (Tech1 n) = prettify n
  prettify (Tech2 n) = prettify n
  prettify (Phil1 n) = prettify n
  prettify (Phil2 n) = prettify n
  prettify (Poli1 n) = prettify n
  prettify (Poli2 n) = prettify n
  prettify (Science1 n) = prettify n
  prettify (Science2 n) = prettify n

instance prettyNumber :: Pretty Number where
  prettify n
    | sigFigs n <= 3 = oneDecimal n
    | sigFigs n <= 4 = noDecimal n
    | sigFigs n <= 5 = insertDecimal 2 n ++ "k"
    | sigFigs n <= 6 = insertDecimal 3 n ++ "k"
    | sigFigs n <= 7 = insertDecimal 4 n ++ "k"
    | sigFigs n <= 8 = insertDecimal 2 n ++ "m"
    | sigFigs n <= 9 = insertDecimal 3 n ++ "m"
    | sigFigs n <= 10 = insertDecimal 4 n ++ "m"
    | sigFigs n <= 11 = insertDecimal 2 n ++ "b"
    | sigFigs n <= 12 = insertDecimal 3 n ++ "b"
    | sigFigs n <= 13 = insertDecimal 4 n ++ "b"
    | sigFigs n <= 14 = insertDecimal 2 n ++ "t"
    | sigFigs n <= 15 = insertDecimal 3 n ++ "t"
    | sigFigs n <= 16 = insertDecimal 4 n ++ "t"
    | sigFigs n <= 17 = insertDecimal 2 n ++ "q"
    | sigFigs n <= 18 = insertDecimal 3 n ++ "q"
    | sigFigs n <= 19 = insertDecimal 4 n ++ "q"
    | sigFigs n <= 20 = insertDecimal 2 n ++ "qi"
    | sigFigs n <= 21 = insertDecimal 3 n ++ "qi"
    | sigFigs n <= 22 = insertDecimal 4 n ++ "qi"
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
  serialize = oneDecimal

instance serializeClicks :: Serialize Clicks where
  serialize (Clicks n) = serialize n

instance serializeClicksPerSecond :: Serialize ClicksPerSecond where
  serialize (ClicksPerSecond n) = serialize n

instance serializeAge :: Serialize Age where
  serialize = show

instance serializeUpgrade :: Serialize Upgrade where
  serialize (Misc1 n) = serialize n
  serialize (Misc2 n) = serialize n
  serialize (Tech1 n) = serialize n
  serialize (Tech2 n) = serialize n
  serialize (Phil1 n) = serialize n
  serialize (Phil2 n) = serialize n
  serialize (Poli1 n) = serialize n
  serialize (Poli2 n) = serialize n
  serialize (Science1 n) = serialize n
  serialize (Science2 n) = serialize n

instance serializeUpgrades :: Serialize Upgrades where
  serialize (Upgrades u) = """{ "misc1": """
    ++ serialize u.misc1 ++ """, "misc2": """
    ++ serialize u.misc2 ++ """, "tech1": """
    ++ serialize u.tech1 ++ """, "tech2": """
    ++ serialize u.tech2 ++ """, "phil1": """
    ++ serialize u.phil1 ++ """, "phil2": """
    ++ serialize u.phil2 ++ """, "poli1": """
    ++ serialize u.poli1 ++ """, "poli2": """
    ++ serialize u.poli2 ++ """, "science1": """
    ++ serialize u.science1 ++ """, "science2": """
    ++ serialize u.science2 ++ "}"

instance serializeMilliseconds :: Serialize Milliseconds where
  serialize (Milliseconds n) = serialize n

initialState :: State
initialState = { currentClicks: Clicks 0.0
               , totalClicks: Clicks 0.0
               , cps: ClicksPerSecond 0.0
               , age: Stone
               , burst: Clicks 1.0
               , upgrades: initialUpgrades
               , message: welcomeMessage
               , now: zero
               , view: UpgradesTab
               }

welcomeMessage :: String
welcomeMessage = "" --unscramble "GTWbVUAvnTSkVTq1pvOlozMapzHtpaE0VD=="

initialUpgrades :: Upgrades
initialUpgrades = Upgrades { misc1: Misc1 0
                           , misc2: Misc2 0
                           , tech1: Tech1 0
                           , tech2: Tech2 0
                           , phil1: Phil1 0
                           , phil2: Phil2 0
                           , poli1: Poli1 0
                           , poli2: Poli2 0
                           , science1: Science1 0
                           , science2: Science2 0
                           }

