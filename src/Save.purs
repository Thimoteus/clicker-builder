module Save (
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
import Lenses
import Upgrades
 
getSavedState :: forall eff. Eff ( console :: CONSOLE, webStorage :: WebStorage | eff ) State
getSavedState = do
  arr <- zip storageKeys <<< catMaybes <$> sequence (getItem localStorage <$> storageKeys)
  let _upgrades = stateValueMaker (view upgrades) parseUpgrades "upgrades" arr
      _currentClicks = stateValueMaker _.currentClicks parseCurrentClicks "currentClicks" arr
      _totalClicks = stateValueMaker _.totalClicks parseTotalClicks "totalClicks" arr
      _age = stateValueMaker _.age parseAge "age" arr
  pure $ { currentClicks: _currentClicks
         , totalClicks: _totalClicks
         , upgrades: _upgrades
         , age: _age
         , message: ""
         , cps: cpsFromUpgrades _upgrades
         , burst: burstFromUpgrades _upgrades
         }

stateValueMaker :: forall a. (State -> a) -> (String -> a) -> String -> Array (Tuple String String) -> a
stateValueMaker default parser key arr =
  maybe (default initialState) parser $ lookup (scramble key) arr

storageKeys :: Array String
storageKeys = map scramble ["totalClicks", "currentClicks", "age", "upgrades"]

parseCurrentClicks :: String -> Clicks
parseCurrentClicks = Clicks <<< getNumber (initialState ^. currentClicksNumber)

parseTotalClicks :: String -> Clicks
parseTotalClicks = Clicks <<< getNumber (initialState ^. totalClicksNumber)

parseUpgrades :: String -> Upgrades
parseUpgrades = maybe initialState.upgrades id <<< get (json <<< ups) <<< unscramble
  where
    ups :: PartialGetter Upgrades Foreign
    ups = getter read

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
saveSingleState = uncurry (setItem localStorage)

stateTuples :: State -> Array (Tuple String String)
stateTuples state = [ makeTuple "currentClicks" state.currentClicks
                    , makeTuple "totalClicks" state.totalClicks
                    , makeTuple "upgrades" state.upgrades
                    , makeTuple "age" state.age
                    ]
  where
    makeTuple :: forall a. (Serialize a) => String -> a -> Tuple String String
    makeTuple key = bimap scramble (scramble <<< serialize) <<< Tuple key
