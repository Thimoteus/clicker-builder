module Main where

import Prelude

import Data.Maybe.Unsafe (fromJust)
import Data.Nullable (toMaybe)

import Signal as S
import Signal.Time as S
import Signal.Channel as C

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
               | a }
type GameState = State ()
type Environment = State ( channel :: C.Channel Action )

data Action = Click
            | CPS
            | Reset
            | Buy Upgrade

data Upgrade = UpCPS Number
             | UpClick Number

mkEnv :: C.Channel Action -> GameState -> Environment
mkEnv channel state = { clicks: state.clicks
                      , channel: channel
                      , clickBurst: state.clickBurst
                      , cps: state.cps }

clicker :: Environment -> ReactElement
clicker env = D.button [P.onClick \ _ -> C.send env.channel Click] [D.text "click me!"]

resetter :: Environment -> ReactElement
resetter env = D.button [P.onClick \ _ -> C.send env.channel Reset] [D.text "reset"]

buyer :: Environment -> ReactElement
buyer env = D.div' [ D.button [P.onClick \ _ -> C.send env.channel (Buy (UpCPS 1.0))] [D.text "buy cps 1.0"]
                   , D.button [P.onClick \ _ -> C.send env.channel (Buy (UpClick 1.0))] [D.text "buy upclick 1.0"] ]

controls :: Environment -> ReactElement
controls env = D.div' $ [clicker, resetter, buyer] <*> [env]

currentClicks :: Environment -> ReactElement
currentClicks env = D.text (show env.clicks)

view :: Environment -> ReactElement
view env = D.div' $ [controls, currentClicks] <*> [env]

initialState :: GameState
initialState = { clicks: 0.0, cps: 0.0, clickBurst: 1.0 }

component :: Environment -> ReactClass Unit
component env = createClass (spec unit \ _ -> pure (view env))

step :: Action -> GameState -> GameState
step Click state = state { clicks = state.clicks + state.clickBurst }
step CPS state = state { clicks = state.clicks + state.cps }
step (Buy (UpCPS n)) state = state { cps = state.cps + n }
step (Buy (UpClick n)) state = state { clickBurst = state.clickBurst + n }
step Reset _ = initialState

updateRate :: S.Signal Number
updateRate = S.every S.second

cps :: S.Signal Action
cps = S.sampleOn updateRate (S.constant CPS)

main = do
  body' <- getBody
  channel <- C.channel Reset
  let actions = C.subscribe channel
      gameState = S.foldp step initialState (cps <> actions)
      game = gameState <#> mkEnv channel >>> (\ env -> render (ui env) body') >>> void
  S.runSignal game
  where
    ui env = D.div' [createFactory (component env) unit]
    getBody = do
      win <- window
      doc <- document win
      elm <- fromJust <$> toMaybe <$> body doc
      pure $ htmlElementToElement elm
