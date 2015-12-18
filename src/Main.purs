module Main where

import Prelude

import Control.Monad.Eff (Eff())
import Text.Browser.Base64 (decode64, encode64)

import Data.Maybe.Unsafe (fromJust)
import Data.Nullable (toMaybe)
import Data.List (List(..), (:))
import Data.Foldable (intercalate)

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
               , saveState :: String
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
                      , saveState: state.saveState
                      , cps: state.cps }

initialState :: GameState
initialState = { clicks: 0.0
               , cps: 0.0
               , upgradesBought: Nil
               , screen: Game
               , saveState: ""
               , clickBurst: 1.0 }

data Action = Click
            | AutoClick
            | Buy Upgrade
            | View Screen
            | Save
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
view env = env # case env.screen of
                      Game -> showGame
                      Settings -> showSettings
                      SaveLoad -> showSaveLoad

showGame :: Component
showGame = foldComponent [changeView, controls, currentClicks]

showSettings :: Component
showSettings = foldComponent [changeView, settingsText]
  where
    settingsText _ = D.text "Settings"

showSaveLoad :: Component
showSaveLoad = foldComponent [changeView, saveGame]
  where
    saveGame env = D.div' [ genericButtonWithText Save "Save game" env
                          , D.text env.saveState ]

changeView :: Component
changeView env = D.div' [ genericButtonWithText (View Game) "Game" env
                        , genericButtonWithText (View Settings) "Settings" env
                        , genericButtonWithText (View SaveLoad) "Save/Load" env ]

updateRate :: Signal Number
updateRate = every second

cps :: Signal Action
cps = sampleOn updateRate (constant AutoClick)

step :: Action -> GameState -> GameState
step Click state = state { clicks = state.clicks + state.clickBurst }
step AutoClick state = state { clicks = state.clicks + state.cps }
step (Buy (CPS n)) state =
  state { cps = state.cps + n
        , upgradesBought = (CPS n) : state.upgradesBought }
step (Buy (Burst n)) state =
  state { clickBurst = state.clickBurst + n
        , upgradesBought = (Burst n) : state.upgradesBought }
step (View screen) state = state { screen = screen }
step Save state = state { saveState = serialize state }
step Reset _ = initialState

serialize :: GameState -> String
serialize state =
  let theCPS = "cps:" ++ show state.cps
      theClicks = "clicks:" ++ show state.clicks
      theClickBurst = "cburst:" ++ show state.clickBurst
      theUpgrades = "upgrades:[" ++ go state.upgradesBought ++ "]"
      go Nil = ""
      go (Cons x Nil) = show x
      go (Cons x xs) = show x ++ "," ++ go xs
   in encode64 $ intercalate "," [theCPS, theClicks, theClickBurst, theUpgrades]


main :: forall eff. Eff ( chan :: Chan, dom :: DOM | eff ) Unit
main = do
  body' <- getBody
  channel <- channel Reset
  let actions = subscribe channel
      gameState = foldp step initialState $ actions <> cps
      game = gameState <#> mkEnv channel >>> (\ env -> render (ui env) body') >>> void
  runSignal game
  where
    ui env = D.div' [createFactory (createClass (spec unit \ _ -> pure (view env))) unit]
    getBody = do
      win <- window
      doc <- document win
      elm <- fromJust <$> toMaybe <$> body doc
      pure $ htmlElementToElement elm
