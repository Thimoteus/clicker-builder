module Main where

import Prelude

import Control.Monad.Eff (Eff())

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
               , screen :: Screen
               | a }
type GameState = State ()
type Environment = State ( channel :: Channel Action )
type Component = Environment -> ReactElement

mkEnv :: Channel Action -> GameState -> Environment
mkEnv channel state = { clicks: state.clicks
                      , channel: channel
                      , clickBurst: state.clickBurst
                      , upgradesBought: state.upgradesBought
                      , screen: state.screen
                      , cps: state.cps }

initialState :: GameState
initialState = { clicks: 0.0
               , cps: 0.0
               , upgradesBought: Nil
               , screen: Game
               , clickBurst: 1.0 }

data Action = Click
            | AutoClick
            | Buy Upgrade
            | Switch Screen
            | Reset

data Upgrade = CPS Number
             | Burst Number

data Screen = Game
            | Settings
            | SaveLoad

instance showUpgrade :: Show Upgrade where
  show (CPS n) = "buy CPS upgrade +" ++ show n
  show (Burst n) = "buy click upgrade +" ++ show n

genericButtonWithText :: Action -> String -> Component
genericButtonWithText act str env =
  D.button [P.onMouseDown \ _ -> send env.channel act] [D.text str]

foldComponent :: Array Component -> Component
foldComponent arr = \ env -> D.div' $ arr <*> [env]

clickButton :: Component
clickButton = genericButtonWithText Click "click me!"

resetButton :: Component
resetButton = genericButtonWithText Reset "reset"

buyButton :: Component
buyButton = foldComponent [upgrade (CPS 1.0), upgrade (Burst 1.0)]

upgrade :: Upgrade -> Component
upgrade up = genericButtonWithText (Buy up) (show up)

controls :: Component
controls = foldComponent [clickButton, resetButton, buyButton]

currentClicks :: Component
currentClicks env = D.text (show env.clicks)

view :: Component
view env = case env.screen of
                Game -> showGame env
                Settings -> showSettings env
                SaveLoad -> showSaveLoad env

showGame :: Component
showGame = foldComponent [changeView, controls, currentClicks]

showSettings :: Component
showSettings = foldComponent [changeView, settingsText]
  where
    settingsText _ = D.text "Settings"

showSaveLoad :: Component
showSaveLoad = foldComponent [changeView, saveLoadText]
  where
    saveLoadText _ = D.text "Save/Load game"

changeView :: Component
changeView env = D.div' [ genericButtonWithText (Switch Game) "Game" env
                        , genericButtonWithText (Switch Settings) "Settings" env
                        , genericButtonWithText (Switch SaveLoad) "Save/Load" env ]

component :: Environment -> ReactClass Unit
component env = createClass (spec unit \ _ -> pure (view env))

step :: Action -> GameState -> GameState
step Click state = state { clicks = state.clicks + state.clickBurst }
step AutoClick state = state { clicks = state.clicks + state.cps }
step (Buy (CPS n)) state =
  state { cps = state.cps + n
        , upgradesBought = (CPS n) : state.upgradesBought }
step (Buy (Burst n)) state =
  state { clickBurst = state.clickBurst + n
        , upgradesBought = (Burst n) : state.upgradesBought }
step (Switch screen) state = state { screen = screen }
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
      gameState = foldp step initialState $ actions <> cps
      game = gameState <#> mkEnv channel >>> (\ env -> render (ui env) body') >>> void
  runSignal game
  where
    ui env = D.div' [createFactory (component env) unit]
    getBody = do
      win <- window
      doc <- document win
      elm <- fromJust <$> toMaybe <$> body doc
      pure $ htmlElementToElement elm
