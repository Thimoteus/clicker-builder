module Age.Bronze.Eval
  ( evalClick
  , autoclick
  , maybeSuffer
  , buyUpgrade
  , suffer
  ) where

import Prelude
import Math (log)
import Lenses
import Types

import Data.Time (Milliseconds())
import Data.Maybe (Maybe(..))
import Data.Lens ((.~), (+~), (-~), (*~), (^?))

import Age.Bronze (getBronzeState, isSuffering)

evalClick :: State -> State
evalClick state
  | isSuffering state = soothe state
  | otherwise = increasePopulation state

soothe :: State -> State
soothe state =
  let n = _.disasterStack $ unsafeBronze getBronzeState state
   in if n <= 0
         then stopSuffering state
         else lowerSuffering state

stopSuffering :: State -> State
stopSuffering = ageState <<< bronzeState <<< bronzeStack .~ 0

lowerSuffering :: State -> State
lowerSuffering state =
      ageState
  <<< bronzeState
  <<< bronzeStack -~ (_.stackRemoval $ unsafeBronze getBronzeState state)
    $ state

increasePopulation :: State -> State
increasePopulation state =
  (ageState <<< bronzeState <<< bronzePop +~ clicksToPop state.burst) state

autoclick :: Milliseconds -> State -> State
autoclick ms state = (currentClicks +~ perSecond pop) state where
  pop = _.population $ unsafeBronze getBronzeState state
  perSecond (Population n) = Clicks (log (log (n / 10.0 + 1.0)) + 1.0)

maybeSuffer :: Disaster -> State -> State
maybeSuffer d s =
  case s.ageState ^? bronzeState <<< bronzeStack of
       Just x -> if x > 0 then s else suffer d s
       _ -> s

suffer :: Disaster -> State -> State
suffer Disaster1 = terrifyPopulation 0.9 <<< setSuffering 20
suffer Disaster2 = terrifyPopulation 0.6 <<< setSuffering 50
suffer Disaster3 = terrifyPopulation 0.3 <<< setSuffering 100
suffer _ = id

terrifyPopulation :: Number -> State -> State
terrifyPopulation c = ageState <<< bronzeState <<< bronzePop *~ Population c

setSuffering :: Int -> State -> State
setSuffering n = ageState <<< bronzeState <<< bronzeStack .~ n

buyUpgrade :: Upgrade -> State -> State
buyUpgrade up@(Misc1 _) = upgrades <<< misc1 .~ up
buyUpgrade up@(Misc2 _) = upgrades <<< misc2 .~ up
buyUpgrade up@(Tech1 _) = upgrades <<< tech1 .~ up
buyUpgrade up@(Tech2 _) = upgrades <<< tech2 .~ up
buyUpgrade up@(Phil1 _) = upgrades <<< phil1 .~ up
buyUpgrade up@(Phil2 _) = upgrades <<< phil2 .~ up
buyUpgrade up@(Poli1 _) = upgrades <<< poli1 .~ up
buyUpgrade up@(Poli2 _) = upgrades <<< poli2 .~ up
buyUpgrade up@(Science1 _) = upgrades <<< science1 .~ up
buyUpgrade up@(Science2 _) = upgrades <<< science2 .~ up
