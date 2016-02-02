module Types 
  ( Action(..)
  , State()
  , AppEffects()
  , Tab(..)
  , initialState
  , welcomeMessage
  , module Types.Numbers
  , module Types.Class
  , module Types.Upgrades
  , module Types.Disaster
  , module Types.Age
  ) where

import Prelude

import Control.Monad.Eff.Console (CONSOLE())
import Control.Monad.Eff.Random (RANDOM())

import Data.Date (Now())
import Data.Time (Milliseconds())

import Browser.WebStorage (WebStorage())
import Halogen (HalogenEffects())

import Types.Class
import Types.Numbers
import Types.Upgrades
import Types.Disaster
import Types.Age

data Action a = Click a
              | Autoclick a
              | Reset a
              | Save a
              | Autosave a
              | Buy Upgrade a
              | Suffer Disaster a
              | View Tab a
              | Advance a

type State = { currentClicks :: Clicks
             , totalClicks :: Clicks
             , cps :: ClicksPerSecond
             , burst :: Clicks
             , age :: Age
             , ageState :: AgeState
             , upgrades :: Upgrades
             , message :: String
             , now :: Milliseconds
             , view :: Tab
             }

type AppEffects = HalogenEffects ( webStorage :: WebStorage
                                 , console :: CONSOLE
                                 , now :: Now
                                 , random :: RANDOM )

data Tab = UpgradesTab
         | AdvanceTab
         | PopulationTab
         | HeroesTab
         | TechTreeTab

instance showView :: Show Tab where
  show UpgradesTab = "Developments"
  show AdvanceTab = "Advance"
  show PopulationTab = "Population"
  show HeroesTab = "Heroes"
  show TechTreeTab = "Tech Tree"

initialState :: State
initialState = { currentClicks: Clicks 0.0
               , totalClicks: Clicks 0.0
               , cps: ClicksPerSecond 0.0
               , age: Stone
               , ageState: NoAgeState
               , burst: Clicks 1.0
               , upgrades: initialUpgrades
               , message: welcomeMessage
               , now: zero
               , view: UpgradesTab
               }

welcomeMessage :: String
welcomeMessage = "" --unscramble "GTWbVUAvnTSkVTq1pvOlozMapzHtpaE0VD=="

