module Save
  ( getSavedState
  , saveState
  , calculateTimeDifferential
  ) where

import Prelude
import Math (abs)

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE())

import Browser.WebStorage (WebStorage(), getItem, localStorage, setItem)

import Data.String (split)
import Data.Bifunctor (bimap)
import Data.Array (catMaybes, zip)
import Data.Array.Unsafe (unsafeIndex)
import Data.Maybe (maybe)
import Data.Either (Either(..))
import Data.Tuple (Tuple(..), uncurry, lookup)
import Data.Traversable (sequence)
import Data.Foldable (traverse_)
import Data.Foreign (Foreign())
import Data.Foreign.Class (read)
import Data.Foreign.Lens (PartialGetter(), json, number, int, get, getter)
import Data.Lens (view, (^.))
import Data.Date (Now(), nowEpochMilliseconds)
import Data.Time(Milliseconds(..))

import Util
import Types
import Lenses
import Upgrades

-- | Used in `main` in lieu of an initial state.
getSavedState :: ∀ eff. Eff ( now :: Now, console :: CONSOLE, webStorage :: WebStorage | eff ) State
getSavedState = do
  arr <- zip storageKeys <<< catMaybes <$> sequence (getItem localStorage <$> storageKeys)
  currentTime <- nowEpochMilliseconds
  let _upgrades = stateValueMaker (view upgrades) parseUpgrades "upgrades" arr
      _currentClicks = stateValueMaker _.currentClicks parseCurrentClicks "currentClicks" arr
      _totalClicks = stateValueMaker _.totalClicks parseTotalClicks "totalClicks" arr
      _age = stateValueMaker _.age parseAge "age" arr
      _ageState = getAgeState _age arr
      _now = stateValueMaker _.now parseNow "now" arr
      _cps = cpsFromUpgrades _age _upgrades
      _burst = burstFromUpgrades _age _upgrades
      _cc = calculateTimeDifferential (_now - currentTime) _cps
  pure $ { currentClicks: _currentClicks + _cc
         , totalClicks: _totalClicks + _cc
         , upgrades: _upgrades
         , age: _age
         , ageState: _ageState
         , message: welcomeMessage
         , cps: _cps
         , burst: _burst
         , now: currentTime
         , view: UpgradesTab
         }

-- | abstraction of a function that helps parse strings to state values
stateValueMaker :: ∀ a. (State -> a) -> (String -> a) -> String -> Array (Tuple String String) -> a
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

getInt :: Int -> String -> Int
getInt default = maybe default id <<< get (json <<< int) <<< unscramble

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
saveState :: ∀ eff. State -> Eff ( webStorage :: WebStorage | eff ) Unit
saveState = traverse_ saveSingleState <<< stateTuples

-- | saves a single value to localstorage
saveSingleState :: ∀ eff. Tuple String String -> Eff ( webStorage :: WebStorage | eff ) Unit
saveSingleState = uncurry (setItem localStorage)

-- | turns a State value into a traversable structure
stateTuples :: State -> Array (Tuple String String)
stateTuples state = [ makeTuple "currentClicks" state.currentClicks
                    , makeTuple "totalClicks" state.totalClicks
                    , makeTuple "upgrades" state.upgrades
                    , makeTuple "age" state.age
                    , makeTuple "now" state.now
                    , makeTuple "ageState" state.ageState
                    ]
  where
    makeTuple :: ∀ a. (Serialize a) => String -> a -> Tuple String String
    makeTuple key v = bimap scramble (scramble <<< serialize) $ Tuple key v

-- | used to calculate how many clicks to add to currentclicks and totalclicks
-- | after user has been away for a certain amount of time
calculateTimeDifferential :: Milliseconds -> ClicksPerSecond -> Clicks
calculateTimeDifferential delta (ClicksPerSecond c) = Clicks (f delta)
  where
  clickDebt :: Number
  clickDebt = c * abs (secondsMS delta)
  f :: Milliseconds -> Number
  f t
    | minutesMS t < 5.0 = clickDebt
    | hoursMS t < 1.0 = clickDebt * 0.9
    | hoursMS t < 12.0 = clickDebt * 0.75
    | daysMS t < 1.0 = clickDebt * 0.6
    | otherwise = clickDebt * 0.5

getAgeState :: Age -> Array (Tuple String String) -> AgeState
getAgeState a xs = as where
  str = getAgeStateCode a xs
  as = case a of
            Bronze -> parseBronzeAgeState str
            _ -> NoAgeState

getAgeStateCode :: Age -> Array (Tuple String String) -> String
getAgeStateCode a xs = maybe "" id $ lookup (scramble "ageState") xs

parseBronzeAgeState :: String -> AgeState
parseBronzeAgeState "" = BronzeS { population: Population 2.0, disasterStack: 0 }
parseBronzeAgeState str =
  let arr = split "," str
      population = Population $ getNumber 2.0 $ unsafeIndex arr 1
      disasterStack = getInt 0 $ unsafeIndex arr 2
   in BronzeS { population, disasterStack }
