module Main where

import Prelude

import Data.Lens (LensP(), (-~), (+~), (.~))

import Control.Monad.Aff (Aff(), runAff, later')
import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Class (liftEff)
import Control.Monad.Eff.Exception (throwException)
import Control.Monad.Rec.Class (forever)

import Halogen
  ( Component(), component
  , Eval(), Render()
  , runUI, modify, action, get, liftEff'
  )
import Halogen.Util (appendToBody, onLoad)
import Halogen.HTML.Indexed (div_, h1_, text, button)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)

import Types
import Save
import Upgrades

interface :: Component State Action (Aff AppEffects)
interface = component render eval
  where
    render :: Render State Action
    render state =
      div_
        [ h1_
          [ text "The world's simplest incremental game" ]
        , button
          [ onMouseDown (input_ Click) ]
          [ text "Click me!" ]
        , div_
          [ text (prettify state.clicks) ]
        , button
          [ onMouseDown (input_ Save) ]
          [ text "Save" ]
        ]

    eval :: Eval Action State Action (Aff AppEffects)
    eval (Click next) = do
      modify $ (clicks +~ 1.0) <<< (total +~ 1.0)
      pure next
    eval (Autoclick next) = do
      modify $ (\ state -> (clicks +~ (state.cps / 10.0)) state)
           <<< (\ state -> (total +~ (state.cps / 10.0)) state)
      pure next
    eval (Reset next) = do
      modify $ const initialState
      pure next
    eval (Save next) = do
      currentState <- get
      liftEff' $ saveState currentState
      pure next
    eval (Buy upgrade next) = do
      modify $ buyUpgrade upgrade
      pure next

    buyUpgrade :: Upgrade -> State -> State
    buyUpgrade up@(CPS1 _ _) = recordPurchase up cps1
    buyUpgrade up@(CPS2 _ _) = recordPurchase up cps2
    buyUpgrade up@(CPS3 _ _) = recordPurchase up cps3
    buyUpgrade up@(CPS4 _ _) = recordPurchase up cps4
    buyUpgrade up@(CPS5 _ _) = recordPurchase up cps5
    buyUpgrade up@(Burst1 _ _) = recordPurchase up burst1
    buyUpgrade up@(Burst2 _ _) = recordPurchase up burst2
    buyUpgrade up@(Burst3 _ _) = recordPurchase up burst3
    buyUpgrade up@(Burst4 _ _) = recordPurchase up burst4
    buyUpgrade up@(Burst5 _ _) = recordPurchase up burst5

    recordPurchase :: Upgrade -> LensP Upgrades Upgrade -> State -> State
    recordPurchase up optic = (clicks -~ upgradeToNumber up)
                          <<< (upgrades <<< optic .~ up)

main :: Eff AppEffects Unit
main = runAff throwException (const (pure unit)) do
  savedState <- liftEff getSavedState
  app <- runUI interface savedState
  onLoad $ appendToBody app.node
  --forever do
    --app.driver $ action Save
    --later' 15000 $ pure unit
  forever do
    app.driver $ action Autoclick
    later' 100 $ pure unit
