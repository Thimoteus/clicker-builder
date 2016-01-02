module Save (
  initialState,
  getSavedState,
  saveState
  ) where

import Prelude

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE())

import Browser.WebStorage (WebStorage(), getItem, localStorage, setItem)

import Data.Bifunctor (bimap)
import Data.Array (catMaybes, zip)
import Data.Maybe (maybe)
import Data.Either (Either(..))
import Data.Tuple (Tuple(..), uncurry, lookup)
import Data.Traversable (sequence)
import Data.Foldable (traverse_)
import Data.Foreign (Foreign())
import Data.Foreign.Class (read)
import Data.Foreign.Lens (PartialGetter(), json, number, get, getter)
import Data.Lens (view, (^.))

import Util
import Types

initialState :: State
initialState = { currentClicks: Clicks 0.0
               , totalClicks: Clicks 0.0
               , cps: ClicksPerSecond 0.0
               , age: Stone
               , burst: Clicks 1.0
               , upgrades: initialUpgrades
               }

initialUpgrades :: Upgrades
initialUpgrades = Upgrades { cps1: CPS1 0 tagCPS1
                           , cps2: CPS2 0 tagCPS2
                           , cps3: CPS3 0 tagCPS3
                           , cps4: CPS4 0 tagCPS4
                           , cps5: CPS5 0 tagCPS5
                           , burst1: Burst1 0 tagBurst1
                           , burst2: Burst2 0 tagBurst2
                           , burst3: Burst3 0 tagBurst3
                           , burst4: Burst4 0 tagBurst4
                           , burst5: Burst5 0 tagBurst5
                           }
 
getSavedState :: forall eff. Eff ( console :: CONSOLE, webStorage :: WebStorage | eff ) State
getSavedState = do
  arr <- zip storageKeys <<< catMaybes <$> sequence (getItem localStorage <$> storageKeys)
  pure $ { currentClicks: stateValueMaker _.currentClicks parseCurrentClicks "currentClicks" arr
         , totalClicks: stateValueMaker _.totalClicks parseTotalClicks "totalClicks" arr
         , cps: stateValueMaker _.cps parseCPS "cps" arr
         , upgrades: stateValueMaker (view upgrades) parseUpgrades "upgrades" arr
         , age: stateValueMaker _.age parseAge "age" arr
         , burst: stateValueMaker _.burst parseBurst "burst" arr
         }

stateValueMaker :: forall a. (State -> a) -> (String -> a) -> String -> Array (Tuple String String) -> a
stateValueMaker default parser key arr =
  maybe (default initialState) parser $ lookup (scramble key) arr

storageKeys :: Array String
storageKeys = map scramble ["totalClicks", "currentClicks", "cps", "burst", "age", "upgrades"]

parseCurrentClicks :: String -> Clicks
parseCurrentClicks = Clicks <<< getNumber (initialState ^. currentClicks <<< clicks)

parseTotalClicks :: String -> Clicks
parseTotalClicks = Clicks <<< getNumber (initialState ^. totalClicks <<< clicks)

parseCPS :: String -> ClicksPerSecond
parseCPS = ClicksPerSecond <<< getNumber (initialState ^. cps <<< clicksPerSecond)

parseUpgrades :: String -> Upgrades
parseUpgrades = maybe initialState.upgrades id <<< get (json <<< ups) <<< unscramble
  where
    ups :: PartialGetter Upgrades Foreign
    ups = getter read

parseBurst :: String -> Clicks
parseBurst = Clicks <<< getNumber (initialState ^. burst <<< clicks)

getNumber :: Number -> String -> Number
getNumber default = maybe default id <<< get (json <<< number) <<< unscramble

parseAge :: String -> Age
parseAge = maybe initialState.age id <<< get (getter age) <<< unscramble
  where
    age :: String -> Either Unit Age
    age "Stone" = Right Stone
    age "Bronze" = Right Bronze
    age "Iron" = Right Iron
    age "Classical" = Right Classical
    age "Dark" = Right Dark
    age "Medieval" = Right Medieval
    age "Renaissance" = Right Renaissance
    age "Imperial" = Right Imperial
    age "Industrial" = Right Industrial
    age "Nuclear" = Right Nuclear
    age "Information" = Right Information
    age "Global" = Right Global
    age "Space" = Right Space
    age "Solar" = Right Solar
    age _ = Left unit

saveState :: forall eff. State -> Eff ( webStorage :: WebStorage | eff ) Unit
saveState = traverse_ saveSingleState <<< stateTuples

saveSingleState :: forall eff. Tuple String String -> Eff ( webStorage :: WebStorage | eff ) Unit
saveSingleState = uncurry $ setItem localStorage

stateTuples :: State -> Array (Tuple String String)
stateTuples state = [ makeTuple "currentClicks" state.currentClicks
                    , makeTuple "totalClicks" state.totalClicks
                    , makeTuple "cps" state.cps
                    , makeTuple "upgrades" state.upgrades
                    , makeTuple "age" state.age
                    , makeTuple "burst" state.burst
                    ]
  where
    makeTuple :: forall a. (Serialize a) => String -> a -> Tuple String String
    makeTuple key = bimap scramble (scramble <<< serialize) <<< Tuple key
