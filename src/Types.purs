module Types where

import Prelude

import Data.List (List())
import Signal.Channel (Chan(), Channel())
import React (ReactElement(..))

type State a = { clicks :: Number
               , cps :: Number
               , clickBurst :: Number
               , upgradesBought :: List Upgrade
               | a }
type GameState = State ()
type Environment = State ( channel :: Channel Action )
type Component = Environment -> ReactElement

data Action = Click
            | AutoClick
            | Buy Upgrade
            | Reset
            | Nothing

data Upgrade = CPS Number
             | Burst Number

instance showUpgrade :: Show Upgrade where
  show (CPS n) = "buy CPS upgrade +" ++ show n
  show (Burst n) = "buy click upgrade +" ++ show n

class Pretty a where
  prettify :: a -> String
