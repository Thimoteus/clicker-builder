module Save where

import Prelude

import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Console (CONSOLE())

import Browser.WebStorage (WebStorage(), getItem, localStorage, setItem)

import Data.Array (catMaybes, zip)
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..), uncurry, lookup)
import Data.List (List(..))
import Data.Traversable (sequence)
import Data.Foreign.Lens (json, number, get)

import Util
import Types

initialState :: GameState
initialState = { clicks: 0.0
               , cps: 0.0
               , upgradesBought: Nil
               , clickBurst: 1.0 }

getSavedState :: forall eff. Eff ( console :: CONSOLE, webStorage :: WebStorage | eff ) GameState
getSavedState = do
  arr <- zip storageKeys <<< catMaybes <$> sequence (getItem localStorage <$> storageKeys)
  pure $ { clicks: maybe initialState.clicks parseClicks $ lookup (scramble "clicks") arr
         , cps: maybe initialState.cps parseCPS $ lookup (scramble "cps") arr
         , upgradesBought: maybe initialState.upgradesBought parseUpgrades $ lookup (scramble "upgradesBought") arr
         , clickBurst: maybe initialState.clickBurst parseClickBurst $ lookup (scramble "clickBurst") arr }
  where
    storageKeys = map scramble ["clicks", "cps", "upgradesBought", "clickBurst"]
    parseClicks = getNumber initialState.clicks
    parseCPS = getNumber initialState.cps
    parseUpgrades _ = Nil
    parseClickBurst = getNumber initialState.clickBurst
    getNumber :: Number -> String -> Number
    getNumber default = maybe default id <<< get (json <<< number) <<< unscramble

saveState :: forall eff. Tuple String String -> Eff ( webStorage :: WebStorage | eff ) Unit
saveState = uncurry $ setItem localStorage

stateTuples :: Environment -> Array (Tuple String String)
stateTuples env = [ Tuple (scramble "clicks") $ scramble $ show env.clicks
                  , Tuple (scramble "cps") $ scramble $ show env.cps
                  , Tuple (scramble "upgradesBought") $ scramble $ show env.upgradesBought
                  , Tuple (scramble "clickBurst") $ scramble $ show env.clickBurst ]
