module Types where

import Prelude

import Data.List (List())
import Data.Array (span, take, drop)
import Data.String (toCharArray, fromCharArray)
import Signal.Channel (Channel())
import React (ReactElement())

type State a = { clicks :: Number
               , cps :: Number
               , clickBurst :: Number
               , upgradesBought :: List Upgrade
               | a }
type GameState = State ()
type Environment = State ( channel :: Channel Action )
type Component = Environment -> ReactElement

mkEnv :: Channel Action -> GameState -> Environment
mkEnv channel state = { clicks: state.clicks
                      , channel: channel
                      , clickBurst: state.clickBurst
                      , upgradesBought: state.upgradesBought
                      , cps: state.cps }

data Action = Click
            | AutoClick
            | Buy Upgrade
            | Reset
            | Nothing

data Upgrade = CPS Number
             | Burst Number

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
