module Types where

import Prelude

import Data.List (List())
import Data.Array (span, take)
import Data.String (toCharArray, fromCharArray)
import Signal.Channel (Channel())
import React (ReactElement())
import Data.Generic (Generic, gShow)
import Data.Lens (LensP(), lens)

type State a = { clicks :: Number
               , cps :: Number
               , clickBurst :: Number
               , upgradesBought :: List Upgrade
               , age :: Age
               | a }
type GameState = State ()
type Environment = State ( channel :: Channel Action )
type Component = Environment -> ReactElement

clicks :: forall a. LensP (State a) Number
clicks = lens _.clicks (_ { clicks = _ })

cps :: forall a. LensP (State a) Number
cps = lens _.cps (_ { cps = _ })

clickBurst :: forall a. LensP (State a) Number
clickBurst = lens _.clickBurst (_ { clickBurst = _ })

upgradesBought :: forall a. LensP (State a) (List Upgrade)
upgradesBought = lens _.upgradesBought (_ { upgradesBought = _ })

age :: forall a. LensP (State a) Age
age = lens _.age (_ { age = _ })

mkEnv :: Channel Action -> GameState -> Environment
mkEnv channel state = { clicks: state.clicks
                      , channel: channel
                      , clickBurst: state.clickBurst
                      , upgradesBought: state.upgradesBought
                      , age: state.age
                      , cps: state.cps }

data Action = Click
            | AutoClick
            | Buy Upgrade
            | Reset
            | Nothing

data Upgrade = CPS Number
             | Burst Number

data CPSUpgrade = Auto1 Number
                | Auto2 Number
                | Auto3 Number
                | Auto4 Number
                | Auto5 Number
                | Auto6 Number
                | Auto7 Number
                | Auto8 Number
                | Auto9 Number
                | Auto0 Number

data BurstUpgrade = Manual1 Number
                  | Manual2 Number
                  | Manual3 Number
                  | Manual4 Number
                  | Manual5 Number
                  | Manual6 Number
                  | Manual7 Number
                  | Manual8 Number
                  | Manual9 Number
                  | Manual0 Number

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

instance showUpgrade :: Show Upgrade where
  show (CPS n) = "buy CPS upgrade +" ++ prettify n
  show (Burst n) = "buy click upgrade +" ++ prettify n

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
