module Lenses where

import Prelude
import Types

import Data.Lens (GetterP(), LensP(), PrismP(), AnIso(), Iso(), lens, prism', to, iso, withIso)
import Data.Time (Milliseconds())
import Data.Maybe (Maybe(..))

import Unsafe.Coerce (unsafeCoerce)

fwd :: ∀ s t a b. AnIso s t a b -> s -> a
fwd i = withIso i \ x _ -> x

bwd :: ∀ s t a b. AnIso s t a b -> b -> t
bwd i = withIso i \ _ x -> x

clicks :: LensP Clicks Number
clicks = lens (\ (Clicks n) -> n) (\ _ m -> Clicks m)

clicksPerSecond :: LensP ClicksPerSecond Number
clicksPerSecond = lens (\ (ClicksPerSecond n) -> n) (\ _ m -> ClicksPerSecond m)

currentClicks :: LensP State Clicks
currentClicks = lens _.currentClicks (_ { currentClicks = _ })

currentClicksNumber :: LensP State Number
currentClicksNumber = currentClicks <<< clicks

totalClicks :: LensP State Clicks
totalClicks = lens _.totalClicks (_ { totalClicks = _ })

totalClicksNumber :: LensP State Number
totalClicksNumber = totalClicks <<< clicks

cps :: LensP State ClicksPerSecond
cps = lens _.cps (_ { cps = _ })

cpsNumber :: LensP State Number
cpsNumber = cps <<< clicksPerSecond

burst :: LensP State Clicks
burst = lens _.burst (_ { burst = _ })

burstNumber :: LensP State Number
burstNumber = burst <<< clicks

age :: LensP State Age
age = lens _.age (_ { age = _ })

message :: LensP State String
message = lens _.message (_ { message = _ })

now :: LensP State Milliseconds
now = lens _.now (_ { now = _ })

tab :: LensP State Tab
tab = lens _.view (_ { view = _ })

upgrades :: LensP State Upgrades
upgrades = lens _.upgrades (_ { upgrades = _ })

runUpgrades (Upgrades u) = u

misc1 :: LensP Upgrades Upgrade
misc1 = lens (_.misc1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { misc1 = v }))

misc1P :: PrismP Upgrade Int
misc1P = prism' Misc1 f where
  f (Misc1 x) = Just x
  f _ = Nothing

misc2 :: LensP Upgrades Upgrade
misc2 = lens (_.misc2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { misc2 = v }))

misc2P :: PrismP Upgrade Int
misc2P = prism' Misc2 f where
  f (Misc2 x) = Just x
  f _ = Nothing

tech1 :: LensP Upgrades Upgrade
tech1 = lens (_.tech1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { tech1 = v }))

tech1P :: PrismP Upgrade Int
tech1P = prism' Tech1 f where
  f (Tech1 x) = Just x
  f _ = Nothing

tech2 :: LensP Upgrades Upgrade
tech2 = lens (_.tech2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { tech2 = v }))

tech2P :: PrismP Upgrade Int
tech2P = prism' Tech2 f where
  f (Tech2 x) = Just x
  f _ = Nothing

phil1 :: LensP Upgrades Upgrade
phil1 = lens (_.phil1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { phil1 = v }))

phil1P :: PrismP Upgrade Int
phil1P = prism' Phil1 f where
  f (Phil1 x) = Just x
  f _ = Nothing

phil2 :: LensP Upgrades Upgrade
phil2 =
  lens (_.phil2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { phil2 = v }))

phil2P :: PrismP Upgrade Int
phil2P = prism' Phil2 f where
  f (Phil2 x) = Just x
  f _ = Nothing

poli1 :: LensP Upgrades Upgrade
poli1 =
  lens (_.poli1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { poli1 = v }))

poli1P :: PrismP Upgrade Int
poli1P = prism' Poli1 f where
  f (Poli1 x) = Just x
  f _ = Nothing

poli2 :: LensP Upgrades Upgrade
poli2 =
  lens (_.poli2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { poli2 = v }))

poli2P :: PrismP Upgrade Int
poli2P = prism' Poli2 f where
  f (Poli2 x) = Just x
  f _ = Nothing

science1 :: LensP Upgrades Upgrade
science1 =
  lens (_.science1 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { science1 = v }))

science1P :: PrismP Upgrade Int
science1P = prism' Science1 f where
  f (Science1 x) = Just x
  f _ = Nothing

science2 :: LensP Upgrades Upgrade
science2 =
  lens (_.science2 <<< runUpgrades) (\ (Upgrades u) v -> Upgrades (u { science2 = v }))

science2P :: PrismP Upgrade Int
science2P = prism' Science2 f where
  f (Science2 x) = Just x
  f _ = Nothing

viewLevel :: GetterP Upgrade Int
viewLevel = to viewLevel'
  where
    viewLevel' (Misc1 n) = n
    viewLevel' (Misc2 n) = n
    viewLevel' (Tech1 n) = n
    viewLevel' (Tech2 n) = n
    viewLevel' (Phil1 n) = n
    viewLevel' (Phil2 n) = n
    viewLevel' (Poli1 n) = n
    viewLevel' (Poli2 n) = n
    viewLevel' (Science1 n) = n
    viewLevel' (Science2 n) = n

ageState :: LensP State AgeState
ageState = lens _.ageState (_ { ageState = _ })

bronzeState :: PrismP AgeState BronzeSRec
bronzeState = prism' BronzeS f where
  f (BronzeS x) = Just x
  f _ = Nothing

bronzePop :: LensP BronzeSRec Population
bronzePop = lens _.population (_ { population = _ })

bronzeStack :: LensP BronzeSRec Int
bronzeStack = lens _.disasterStack (_ { disasterStack = _ })

clicksAsPop :: Iso Clicks Clicks Population Population
clicksAsPop = iso unsafeCoerce unsafeCoerce

clicksToPop :: Clicks -> Population
clicksToPop = fwd clicksAsPop

popToClicks :: Population -> Clicks
popToClicks = bwd clicksAsPop
