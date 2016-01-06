module Main where

import Prelude hiding (div, top)

import Data.Lens (LensP(), (-~), (+~), (.~), (^.))
import Data.Foldable (fold)

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
import Halogen.HTML.Indexed (div, div_, h1_, text, button, br_, a, i, className)
import Halogen.HTML.Events.Indexed (onMouseDown, input_)
import Halogen.HTML.Properties.Indexed (disabled, id_, href, class_, title)

import Types
import Lenses
import Save
import Upgrades

interface :: Component State Action (Aff AppEffects)
interface = component render eval

render :: Render State Action
render state =
  div_
    [ top
    , side
    , main'
    ]
  where
    top = h1_ [ text "clicker builder" ]
    side = div [ id_ "side" ]
      [ div_
        [ text "Current clicks:"
        , br_
        , text (prettify state.currentClicks)
        , br_
        , text "Burst:"
        , br_
        , text (prettify state.burst)
        , br_
        , text "CPS:"
        , br_
        , text (prettify state.cps)
        ]
      , div
        [ id_ "clicker-wrapper" ]
        [ div
          [ onMouseDown (input_ Click)
          , id_ "the-button"
          ]
          [ a
            [ href "#" ]
            [ i [ class_ $ className "fa fa-hand-pointer-o" ] [] ]
          ]
        ]
      ]
    main' = div [ id_ "main" ]
      [ button
        [ onMouseDown (input_ Save) ]
        [ text "Save" ]
      , button
        [ onMouseDown (input_ Reset) ]
        [ text "Reset" ]
      , div
        [ id_ "upgrades" ]
        [ upgradesComponent state ]
      ]

upgradesComponent :: Render State Action
upgradesComponent state =
  div_
    [ div [ class_ $ className "upgrades cps" ]
      [ upgradeButton state cps1
      , upgradeButton state cps2
      , upgradeButton state cps3
      , upgradeButton state cps4
      , upgradeButton state cps5
      ]
    , div [ class_ $ className "upgrades burst" ]
      [ upgradeButton state burst1
      , upgradeButton state burst2
      , upgradeButton state burst3
      , upgradeButton state burst4
      , upgradeButton state burst5
      ]
    ]
  where
    upgradeButton :: State -> LensP Upgrades Upgrade -> _
    upgradeButton state cpsn =
      button (upgradeProps state cpsn)
              [ text $
                fold [upgradeName (state ^. upgrades <<< cpsn) state.age
                     , " "
                     , prettify (upgradeCost $ nextUpgrade $ state ^. upgrades <<< cpsn)
                     ]
              ]
    hoverText state cpsn = [ title $ upgradeDescription (state ^. upgrades <<< cpsn) state.age ]
    upgradeProps :: State -> LensP Upgrades Upgrade -> _
    upgradeProps state cpsn =
      let clickAction = onMouseDown $ input_ $ Buy $ nextUpgrade $ state ^. upgrades <<< cpsn
       in fold [ [ disabled $ not $ canBuyUpgrade state cpsn ]
               , hoverText state cpsn
               , if canBuyUpgrade state cpsn
                    then [ clickAction ]
                    else []
               ]

eval :: Eval Action State Action (Aff AppEffects)
eval (Click next) = do
  modify $ \ state -> ((currentClicksNumber +~ state ^. burstNumber)
                   <<< (totalClicksNumber +~ state ^. burstNumber)) state
  pure next
eval (Autoclick next) = do
  modify \ state -> ((currentClicksNumber +~ state ^. cpsNumber / 10.0)
                 <<< (totalClicksNumber +~ state ^. cpsNumber / 10.0)) state
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
buyUpgrade up@(CPS1 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps1
buyUpgrade up@(CPS2 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps2
buyUpgrade up@(CPS3 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps3
buyUpgrade up@(CPS4 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps4
buyUpgrade up@(CPS5 _ _) = installUpgrade up cpsNumber <<< recordPurchase up cps5
buyUpgrade up@(Burst1 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst1
buyUpgrade up@(Burst2 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst2
buyUpgrade up@(Burst3 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst3
buyUpgrade up@(Burst4 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst4
buyUpgrade up@(Burst5 _ _) = installUpgrade up burstNumber <<< recordPurchase up burst5

recordPurchase :: Upgrade -> LensP Upgrades Upgrade -> State -> State
recordPurchase up optic = (currentClicksNumber -~ upgradeCost up)
                      <<< (upgrades <<< optic .~ up)

installUpgrade :: Upgrade -> LensP State Number -> State -> State
installUpgrade up optic = optic +~ upgradeBoost up

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
