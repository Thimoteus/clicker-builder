module Main where

import Prelude

import Control.Monad.Eff (Eff())

import Data.Maybe (Maybe(..))
import Data.Maybe.Unsafe (fromJust)
import Data.Nullable (toMaybe)
import Data.List (List(..), (:))

import Signal (Signal(), constant, foldp, runSignal, sampleOn)
import Signal.Time (every, second)
import Signal.Channel (Chan(), Channel(), channel, send, subscribe)

import DOM (DOM())
import DOM.HTML (window)
import DOM.HTML.Document (body)
import DOM.HTML.Types (htmlElementToElement)
import DOM.HTML.Window (document)

import React
import React.DOM as D
import React.DOM.Props as P

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

initialState :: GameState
initialState = { clicks: 0.0
               , cps: 0.0
               , upgradesBought: Nil
               , clickBurst: 1.0 }

data Action = Click
            | AutoClick
            | Buy Upgrade
            | Reset

data Upgrade = CPS Number
             | Burst Number

instance showUpgrade :: Show Upgrade where
  show (CPS n) = "buy CPS upgrade +" ++ show n
  show (Burst n) = "buy click upgrade +" ++ show n

genericButtonWithText :: Action -> String -> Environment -> ReactElement
genericButtonWithText act str env =
  D.button [P.onClick \ _ -> send env.channel act] [D.text str]

clickButton :: Component
clickButton = genericButtonWithText Click "click me!"

resetButton :: Component
resetButton = genericButtonWithText Reset "reset"

buyButton :: Component
buyButton env = D.div' $ flip apply [env] [ upgrade (CPS 1.0)
                                          , upgrade (Burst 1.0)
                                          ]

upgrade :: Upgrade -> Component
upgrade up = genericButtonWithText (Buy up) (show up)

controls :: Component
controls env = D.div' $ flip apply [env] [clickButton, resetButton, buyButton]

currentClicks :: Component
currentClicks env = D.text (show env.clicks)

view :: Component
view env = D.div' $ flip apply [env] [controls, currentClicks]

component :: Environment -> ReactClass Unit
component env = createClass (spec unit \ _ -> pure (view env))

step :: Action -> GameState -> GameState
step Click state = state { clicks = state.clicks + state.clickBurst }
step AutoClick state = state { clicks = state.clicks + state.cps }
step (Buy (CPS n)) state = state { cps = state.cps + n, upgradesBought = (CPS n) : state.upgradesBought }
step (Buy (Burst n)) state = state { clickBurst = state.clickBurst + n, upgradesBought = (Burst n) : state.upgradesBought }
step Reset _ = initialState

updateRate :: Signal Number
updateRate = every second

cps :: Signal Action
cps = sampleOn updateRate (constant AutoClick)

main :: forall eff. Eff ( chan :: Chan, dom :: DOM | eff ) Unit
main = do
  body' <- getBody
  channel <- channel Reset
  let actions = subscribe channel
      gameState = foldp step initialState (cps <> actions)
      game = gameState <#> mkEnv channel >>> (\ env -> render (ui env) body') >>> void
  runSignal game
  where
    ui env = D.div' [createFactory (component env) unit]
    getBody = do
      win <- window
      doc <- document win
      elm <- fromJust <$> toMaybe <$> body doc
      pure $ htmlElementToElement elm
