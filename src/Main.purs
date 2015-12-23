module Main where

import Prelude hiding (div)

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE(), log)

import Browser.WebStorage (WebStorage())

import Data.List ((:))
import Data.Foldable (traverse_)

import Signal (Signal(), constant, foldp, runSignal, sampleOn)
import Signal.Time (every, second)
import Signal.Channel (Chan(), channel, subscribe)

import DOM (DOM())

import React (render, createFactory, createClass, spec)
import React.DOM (div', text, button)
import React.DOM.Props (onMouseDown)

import Types
import Save
import Upgrades
import Blocks
import Util

clickButton :: Component
clickButton = actionButton Click "click me!"

resetButton :: Component
resetButton = actionButton Reset "reset"

buyButtons :: Component
buyButtons env = (foldComponent' <<< map upgrade $ availableUpgrades env) env

saveButton :: Component
saveButton env =
  button [onMouseDown \ _ -> traverse_ saveState $ stateTuples env] [text "Save"]

controls :: Component
controls = foldComponent' [clickButton, resetButton, buyButtons, saveButton]

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
