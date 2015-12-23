module Main where

import Prelude hiding (div)

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE(), log)

import Browser.WebStorage (WebStorage())

import Data.Array (catMaybes, zip)
import Data.Maybe (maybe)
import Data.List (List(..), (:))
import Data.Foldable (traverse_)
import Data.Traversable (sequence)
import Data.Tuple(Tuple(..))
import Data.Foreign.Lens (json, number, get)

import Signal (Signal(), constant, foldp, runSignal, sampleOn)
import Signal.Time (every, second)
import Signal.Channel (Chan(), Channel(), channel, send, subscribe)

import DOM (DOM())

import React (render, createFactory, createClass, spec)
import React.DOM (div, div', text, button)
import React.DOM.Props (onMouseDown, _id)

import Types
import Save
import Util

mkEnv :: Channel Action -> GameState -> Environment
mkEnv channel state = { clicks: state.clicks
                      , channel: channel
                      , clickBurst: state.clickBurst
                      , upgradesBought: state.upgradesBought
                      , cps: state.cps }

actionButton :: Action -> String -> Component
actionButton act str env =
  button [onMouseDown \ _ -> send env.channel act] [text str]

foldComponent :: String -> Array Component -> Component
foldComponent name arr = \ env -> div [_id name] $ arr <*> [env]

foldComponent' :: Array Component -> Component
foldComponent' arr = \ env -> div' $ arr <*> [env]

clickButton :: Component
clickButton = actionButton Click "click me!"

resetButton :: Component
resetButton = actionButton Reset "reset"

buyButton :: Component
buyButton env = (foldComponent' <<< map upgrade $ availableUpgrades env) env

availableUpgrades :: Environment -> Array Upgrade
availableUpgrades { cps = cps, clickBurst = clickBurst, clicks = clicks }
  = availableBurst clickBurst clicks ++ availableCPS cps clicks
    where
      availableBurst curr total
        | total >= 2.0 * curr ^ 2 + 50.0 = [Burst (curr * 2.0)]
        | otherwise = []
      availableCPS curr total
        | total >= 2.0 * curr ^ 2 + 50.0 = [CPS (curr * 1.3 + 1.0)]
        | otherwise = []

saveButton :: Component
saveButton env =
  button [onMouseDown \ _ -> traverse_ saveState $ stateTuples env] [text "Save"]

upgrade :: Upgrade -> Component
upgrade up = actionButton (Buy up) (show up)

controls :: Component
controls = foldComponent' [clickButton, resetButton, buyButton, saveButton]

currentClicks :: Component
currentClicks env = text (show env.clicks)

showGame :: Component
showGame = foldComponent' [controls, currentClicks]

cps :: Signal Action
cps = sampleOn (every second) (constant AutoClick)

step :: Action -> GameState -> GameState
step Click state = state { clicks = state.clicks + state.clickBurst }
step AutoClick state = state { clicks = state.clicks + state.cps }
step (Buy (CPS n)) state =
  state { cps = state.cps + n
        , upgradesBought = (CPS n) : state.upgradesBought }
step (Buy (Burst n)) state =
  state { clickBurst = state.clickBurst + n
        , upgradesBought = (Burst n) : state.upgradesBought }
step Nothing s = s
step Reset _ = initialState

main :: forall eff. Eff ( console :: CONSOLE, webStorage :: WebStorage, chan :: Chan, dom :: DOM | eff ) Unit
main = do
  body' <- getBody
  gameChan <- channel Nothing
  savedState <- getSavedState
  let actions = subscribe gameChan
      gameState = foldp step savedState $ actions <> cps
      game = gameState <#> mkEnv gameChan >>> (\ env -> render (gameUI env) body') >>> void
  runSignal game

gameUI :: Component
gameUI env = div' [createFactory (createClass (spec unit \ _ -> pure (showGame env))) unit]
