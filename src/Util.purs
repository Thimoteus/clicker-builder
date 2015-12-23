module Util where

import Prelude

import Control.Monad.Eff (Eff())
import Text.Browser.Base64 (decode64, encode64)

import Data.Maybe.Unsafe (fromJust)
import Data.Nullable (toMaybe)
import Data.Maybe (Maybe(..))
import Data.Either (Either(..))
import Data.String (toCharArray, fromCharArray)
import Data.Char (toCharCode, fromCharCode)

import DOM (DOM())
import DOM.Node.Types (ElementId(..), Element())
import DOM.Node.NonElementParentNode (getElementById)
import DOM.HTML (window)
import DOM.HTML.Document (body)
import DOM.HTML.Types (htmlElementToElement, htmlDocumentToNonElementParentNode)
import DOM.HTML.Window (document)

getBody :: forall eff. Eff ( dom :: DOM | eff ) Element
getBody = do
  win <- window
  doc <- document win
  elm <- fromJust <$> toMaybe <$> body doc
  pure $ htmlElementToElement elm

findById :: forall eff. String -> Eff ( dom :: DOM | eff ) Element
findById str = do
  win <- window
  doc <- document win
  fromJust <$> toMaybe <$> getElementById (ElementId str) (htmlDocumentToNonElementParentNode doc)

eitherToMaybe :: forall a b. Either a b -> Maybe b
eitherToMaybe (Left _) = Nothing
eitherToMaybe (Right x) = Just x

infixr 8 ^
(^) :: Int -> Number -> Number
(^) = expImpl

foreign import expImpl :: forall a b c. a -> b -> c

scramble :: String -> String
scramble = rot13 <<< encode64 <<< rot13

unscramble :: String -> String
unscramble = rot13 <<< decode64 <<< rot13

rot13 :: String -> String
rot13 = fromCharArray <<< map rotate <<< toCharArray
  where
    rotate :: Char -> Char
    rotate c
      | toCharCode c <= 90 && toCharCode c >= 65 = fromCharCode $ 65 + ((toCharCode c - 52) `mod` 26)
      | toCharCode c <= 122 && toCharCode c >= 97 = fromCharCode $ 97 + ((toCharCode c - 84) `mod` 26)
      | otherwise = c
