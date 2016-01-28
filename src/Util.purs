module Util where

import Prelude

import Text.Base64 (decode64, encode64)
import Math (pow)
import Unsafe.Coerce (unsafeCoerce)

import Halogen.HTML.Core (HTML(), Prop(Attr), className, attrName)
import Halogen.HTML.Indexed (p_, div_, text)
import Halogen.HTML.Properties.Indexed (I(), IProp(), class_)

import Data.Array (span, length, take, range, drop)
import Data.Either(Either(..))
import Data.Maybe (Maybe(..))
import Data.Maybe.Unsafe (fromJust)
import Data.Tuple (Tuple(..))
import Data.List (List(..))
import Data.String (toCharArray, fromCharArray)
import Data.Char (toCharCode, fromCharCode)
import Data.Foldable (Foldable, foldl)
import Data.Traversable (traverse)
import Data.Time (Milliseconds(..))

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

insertDecimal :: Int -> Number -> String
insertDecimal i num =
  let shown = take (i + 1) $ toCharArray $ show num
      len = length shown
      large = take (len - 1) shown
      small = ['.'] ++ drop (len - 1) shown
   in fromCharArray (large ++ small)


type Scheduler e = { timer :: Int, comp :: Aff e Unit, numbalert :: Int }
schedule :: forall e. Array (Tuple Int (Aff e Unit)) -> Aff e Unit
schedule arr =
  tailRecM go (map (\ (Tuple timer comp) -> { timer: timer
                                            , comp: comp
                                            , numbalert: theGCD })  arr)
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
           pure (s { numbalert = theGCD })
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

infix 7 ...
(...) :: Int -> Int -> Array Int
(...) inf sup | inf <= sup = range inf sup
              | otherwise = []

renderParagraphs :: forall p i. Array String -> HTML p i
renderParagraphs = div_ <<< map (p_ <<< pure <<< text)

mkClass :: forall p i. String -> IProp ( class :: I | p ) i
mkClass = class_ <<< className

dataHint :: forall i r. String -> IProp r i
dataHint = unsafeCoerce dhint
  where
  dhint :: String -> Prop i
  dhint = Attr Nothing (attrName "data-hint")

secondsMS :: Milliseconds -> Number
secondsMS (Milliseconds n) = n / 1000.0

minutesMS :: Milliseconds -> Number
minutesMS n = secondsMS n / 60.0

hoursMS :: Milliseconds -> Number
hoursMS n = minutesMS n / 60.0

daysMS :: Milliseconds -> Number
daysMS n = hoursMS n / 24.0
