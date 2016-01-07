module Util where

import Prelude

import Text.Browser.Base64 (decode64, encode64)
import Math (pow)

import Data.Array (span, length, take)
import Data.Either(Either(..))
import Data.Maybe (Maybe(..))
import Data.Maybe.Unsafe (fromJust)
import Data.Tuple (Tuple(..))
import Data.List (List(..))
import Data.String (toCharArray, fromCharArray)
import Data.Char (toCharCode, fromCharCode)
import Data.Foldable (Foldable, foldl)
import Data.Traversable (traverse)

import Control.Monad.Aff (Aff(), later')
import Control.Monad.Rec.Class (tailRecM)

infixr 8 ^
(^) :: Number -> Number -> Number
(^) = pow

scramble :: String -> String
scramble = rot13 <<< encode64 <<< rot13

unscramble :: String -> String
unscramble = rot13 <<< decode64 <<< rot13

rot13 :: String -> String
rot13 = fromCharArray <<< map rotate <<< toCharArray
  where
    rotate :: Char -> Char
    rotate c
      -- muthafuckin' magic numbers
      | toCharCode c <= 90 && toCharCode c >= 65 = fromCharCode $ 65 + ((toCharCode c - 52) `mod` 26)
      | toCharCode c <= 122 && toCharCode c >= 97 = fromCharCode $ 97 + ((toCharCode c - 84) `mod` 26)
      | otherwise = c

sigFigs :: Number -> Int
sigFigs n =
  let arr = toCharArray (show n)
      split = span (/= '.') arr
   in length (split.init)

chopDigits :: Int -> Array Char -> Array Char
chopDigits n arr = let split = span (/= '.') arr
                       large = split.init
                       small = take n $ split.rest
                    in large ++ small

oneDecimal :: Number -> String
oneDecimal = transformDigits (chopDigits 2)

noDecimal :: Number -> String
noDecimal = transformDigits (chopDigits 0)

transformDigits :: (Array Char -> Array Char) -> Number -> String
transformDigits f = show >>> toCharArray >>> f >>> fromCharArray

type Scheduler e = { timer :: Int, comp :: Aff e Unit, numbalert :: Int }
schedule :: forall e. Array (Tuple Int (Aff e Unit)) -> Aff e Unit
schedule arr =
  tailRecM go (map (\ (Tuple timer comp) -> { timer: timer
                                            , comp: comp
                                            , numbalert: timer })  arr)
  where
    timers = extractFsts arr
    theGCD = fromJust (foldGCD timers)
    go :: Array (Scheduler e) -> Aff e (Either (Array (Scheduler e)) Unit)
    go comps = do
      comps' <- traverse goElt comps
      later' theGCD (pure (Left comps'))
    goElt :: Scheduler e -> Aff e (Scheduler e)
    goElt s@{ timer: timer, comp: comp, numbalert: numbalert } =
      if numbalert >= timer
         then do
           comp
           pure (s { numbalert = timer })
         else
           pure (s { numbalert = numbalert + theGCD })

foldGCD :: forall f. (Foldable f) => f Int -> Maybe Int
foldGCD = foldl foldGCD' Nothing
  where
    foldGCD' Nothing y = Just y
    foldGCD' (Just x) y = Just (gcd x y)

extractFsts :: forall f a b. (Foldable f) => f (Tuple a b) -> List a
extractFsts = foldl (\ acc (Tuple x _) -> Cons x acc) Nil

gcd :: Int -> Int -> Int
gcd m n
  | n == 0 = m
  | otherwise = gcd n (m `mod` n)

divides :: Int -> Int -> Boolean
divides m n = n `mod` m == 0
