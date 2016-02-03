module Types.Class where

import Prelude
import Util

import Data.Time (Milliseconds(..))

class Serialize a where
  serialize :: a -> String

instance serializeString :: Serialize String where
  serialize = id

instance serializeInt :: Serialize Int where
  serialize = show

instance serializeNumber :: Serialize Number where
  serialize = oneDecimal

instance serializeMilliseconds :: Serialize Milliseconds where
  serialize (Milliseconds n) = serialize n

class Pretty a where
  prettify :: a -> String

instance prettyNumber :: Pretty Number where
  prettify n
    | sigFigs n <= 3 = oneDecimal n
    | sigFigs n <= 4 = noDecimal n
    | sigFigs n <= 5 = insertDecimal 2 n ++ "k"
    | sigFigs n <= 6 = insertDecimal 3 n ++ "k"
    | sigFigs n <= 7 = insertDecimal 4 n ++ "k"
    | sigFigs n <= 8 = insertDecimal 2 n ++ "m"
    | sigFigs n <= 9 = insertDecimal 3 n ++ "m"
    | sigFigs n <= 10 = insertDecimal 4 n ++ "m"
    | sigFigs n <= 11 = insertDecimal 2 n ++ "b"
    | sigFigs n <= 12 = insertDecimal 3 n ++ "b"
    | sigFigs n <= 13 = insertDecimal 4 n ++ "b"
    | sigFigs n <= 14 = insertDecimal 2 n ++ "t"
    | sigFigs n <= 15 = insertDecimal 3 n ++ "t"
    | sigFigs n <= 16 = insertDecimal 4 n ++ "t"
    | sigFigs n <= 17 = insertDecimal 2 n ++ "q"
    | sigFigs n <= 18 = insertDecimal 3 n ++ "q"
    | sigFigs n <= 19 = insertDecimal 4 n ++ "q"
    | sigFigs n <= 20 = insertDecimal 2 n ++ "qi"
    | sigFigs n <= 21 = insertDecimal 3 n ++ "qi"
    | sigFigs n <= 22 = insertDecimal 4 n ++ "qi"
    | otherwise = "Your civilization can't count this high!"

instance prettyInt :: Pretty Int where
  prettify = show
