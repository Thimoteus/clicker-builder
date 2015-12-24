module Save where

import Prelude

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE())

import Browser.WebStorage (WebStorage(), getItem, localStorage, setItem)

import Data.Array (catMaybes, zip)
import Data.Maybe (maybe)
import Data.Either (Either(..))
import Data.Tuple (Tuple(..), uncurry, lookup)
import Data.List (List(..))
import Data.Traversable (sequence)
import Data.Foreign.Lens (json, number, get, getter)

import Util
import Types

initialState :: GameState
initialState = { clicks: 0.0
               , cps: 0.0
               , upgradesBought: Nil
               , age: Stone
               , clickBurst: 1.0 }

getSavedState :: forall eff. Eff ( console :: CONSOLE, webStorage :: WebStorage | eff ) GameState
getSavedState = do
  arr <- zip storageKeys <<< catMaybes <$> sequence (getItem localStorage <$> storageKeys)
  pure $ { clicks: stateValueMaker _.clicks parseClicks "clicks" arr
         , cps: stateValueMaker _.cps parseCPS "cps" arr
         , upgradesBought: stateValueMaker _.upgradesBought parseUpgrades "upgradesBought" arr
         , age: stateValueMaker _.age parseAge "age" arr
         , clickBurst: stateValueMaker _.clickBurst parseClickBurst "clickBurst" arr }

stateValueMaker :: forall a. (GameState -> a) -> (String -> a) -> String -> Array (Tuple String String) -> a
stateValueMaker default parser key arr =
  maybe (default initialState) parser $ lookup (scramble key) arr

storageKeys :: Array String
storageKeys = map scramble ["clicks", "cps", "upgradesBought", "clickBurst", "age"]

parseClicks :: String -> Number
parseClicks = getNumber initialState.clicks

parseCPS :: String -> Number
parseCPS = getNumber initialState.cps

parseUpgrades :: String -> List Upgrade
parseUpgrades _ = Nil

parseClickBurst :: String -> Number
parseClickBurst = getNumber initialState.clickBurst

getNumber :: Number -> String -> Number
getNumber default = maybe default id <<< get (json <<< number) <<< unscramble

parseAge :: String -> Age
parseAge = maybe initialState.age id <<< get (getter age) <<< unscramble
  where
    age :: String -> Either Unit Age
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

saveState :: forall eff. Tuple String String -> Eff ( webStorage :: WebStorage | eff ) Unit
saveState = uncurry $ setItem localStorage

stateTuples :: Environment -> Array (Tuple String String)
stateTuples env = [ Tuple (scramble "clicks") $ scramble $ show env.clicks
                  , Tuple (scramble "cps") $ scramble $ show env.cps
                  , Tuple (scramble "upgradesBought") $ scramble $ show env.upgradesBought
                  , Tuple (scramble "age") $ scramble $ show env.age
                  , Tuple (scramble "clickBurst") $ scramble $ show env.clickBurst ]
