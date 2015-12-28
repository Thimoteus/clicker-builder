module Util where

import Prelude

--import Control.Monad.Eff (Eff())
import Text.Browser.Base64 (decode64, encode64)

import Data.String (toCharArray, fromCharArray)
import Data.Char (toCharCode, fromCharCode)
import Math (pow)

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
