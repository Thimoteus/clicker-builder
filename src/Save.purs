module Save (
  getSavedState,
  saveState,
  calculateTimeDifferential
  ) where

import Prelude
import Math (abs)

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE(), log)

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
import Data.Date (Now(), nowEpochMilliseconds)
import Data.Time(Milliseconds(..))

import Util
import Types
import Lenses
import Upgrades

-- | Used in `main` in lieu of an initial state.
getSavedState :: forall eff. Eff ( now :: Now, console :: CONSOLE, webStorage :: WebStorage | eff ) State
getSavedState = do
  arr <- zip storageKeys <<< catMaybes <$> sequence (getItem localStorage <$> storageKeys)
  currentTime <- nowEpochMilliseconds
  let _upgrades = stateValueMaker (view upgrades) parseUpgrades "upgrades" arr
      _currentClicks = stateValueMaker _.currentClicks parseCurrentClicks "currentClicks" arr
      _totalClicks = stateValueMaker _.totalClicks parseTotalClicks "totalClicks" arr
      _age = stateValueMaker _.age parseAge "age" arr
      _now = stateValueMaker _.now parseNow "now" arr
      _cps = cpsFromUpgrades _upgrades
      _burst = burstFromUpgrades _upgrades
      _cc = calculateTimeDifferential (_now - currentTime) _cps
  log $ "currentTime: " ++ show currentTime
  log $ "_now: " ++ show _now
  log $ "sum: " ++ prettify _cc
  pure $ { currentClicks: _currentClicks + _cc
         , totalClicks: _totalClicks + _cc
         , upgrades: _upgrades
         , age: _age
         , message: welcomeMessage
         , cps: _cps
         , burst: _burst
         , now: currentTime
         }

-- | abstraction of a function that helps parse strings to state values
stateValueMaker :: forall a. (State -> a) -> (String -> a) -> String -> Array (Tuple String String) -> a
stateValueMaker default parser key arr =
  maybe (default initialState) parser $ lookup (scramble key) arr

-- | localstorage keys of all saved values
storageKeys :: Array String
storageKeys = map scramble ["totalClicks", "currentClicks", "age", "upgrades", "now"]

parseCurrentClicks :: String -> Clicks
parseCurrentClicks = Clicks <<< getNumber (initialState ^. currentClicksNumber)

parseTotalClicks :: String -> Clicks
parseTotalClicks = Clicks <<< getNumber (initialState ^. totalClicksNumber)

parseUpgrades :: String -> Upgrades
parseUpgrades = maybe initialState.upgrades id <<< get (json <<< ups) <<< unscramble
  where
    ups :: PartialGetter Upgrades Foreign
    ups = getter read

parseNow :: String -> Milliseconds
parseNow = Milliseconds <<< getNumber zero

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

-- | saves every value we care about to localstorage
saveState :: forall eff. State -> Eff ( webStorage :: WebStorage | eff ) Unit
saveState = traverse_ saveSingleState <<< stateTuples

-- | saves a single value to localstorage
saveSingleState :: forall eff. Tuple String String -> Eff ( webStorage :: WebStorage | eff ) Unit
saveSingleState = uncurry (setItem localStorage)

-- | turns a State value into a traversable structure
stateTuples :: State -> Array (Tuple String String)
stateTuples state = [ makeTuple "currentClicks" state.currentClicks
                    , makeTuple "totalClicks" state.totalClicks
                    , makeTuple "upgrades" state.upgrades
                    , makeTuple "age" state.age
                    , makeTuple "now" state.now
                    ]
  where
    makeTuple :: forall a. (Serialize a) => String -> a -> Tuple String String
    makeTuple key = bimap scramble (scramble <<< serialize) <<< Tuple key

-- | used to calculate how many clicks to add to currentclicks and totalclicks
-- | after user has been away for a certain amount of time
calculateTimeDifferential :: Milliseconds -> ClicksPerSecond -> Clicks
calculateTimeDifferential delta (ClicksPerSecond c) = Clicks (f delta)
  where
  clickDebt :: Number
  clickDebt = c * abs (seconds delta)
  f :: Milliseconds -> Number
  f t
    | minutes t < 5.0 = clickDebt
    | hours t < 1.0 = clickDebt * 0.9
    | hours t < 12.0 = clickDebt * 0.75
    | days t < 1.0 = clickDebt * 0.6
    | otherwise = clickDebt * 0.5

