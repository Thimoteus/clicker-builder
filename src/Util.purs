module Util where

import Prelude

import Text.Browser.Base64 (decode64, encode64)
import Math (pow)

import Data.Array (span, length, take)
import Data.String (toCharArray, fromCharArray)
import Data.Char (toCharCode, fromCharCode)

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

oneDecimal :: Number -> String -- Array Char -> Array Char
oneDecimal = transformDigits (chopDigits 2)

noDecimal :: Number -> String -- Array Char -> Array Char
noDecimal = transformDigits (chopDigits 0)

transformDigits :: (Array Char -> Array Char) -> Number -> String
transformDigits f = show >>> toCharArray >>> f >>> fromCharArray
