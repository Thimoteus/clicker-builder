module Types.Numbers where

import Prelude

import Types.Class

newtype Clicks = Clicks Number
newtype ClicksPerSecond = ClicksPerSecond Number

instance eqClicks :: Eq Clicks where
  eq (Clicks m) (Clicks n) = m == n

instance eqClicksPerSecond :: Eq ClicksPerSecond where
  eq (ClicksPerSecond m) (ClicksPerSecond n) = m == n

instance ordClicks :: Ord Clicks where
  compare (Clicks m) (Clicks n) = compare m n

instance ordClicksPerSecond :: Ord ClicksPerSecond where
  compare (ClicksPerSecond m) (ClicksPerSecond n) = compare m n

instance semiringClicks :: Semiring Clicks where
  one = Clicks one
  zero = Clicks zero
  mul (Clicks m) (Clicks n) = Clicks (m * n)
  add (Clicks m) (Clicks n) = Clicks (m + n)

instance semiringClicksPerSecond :: Semiring ClicksPerSecond where
  one = ClicksPerSecond one
  zero = ClicksPerSecond zero
  mul (ClicksPerSecond m) (ClicksPerSecond n) = ClicksPerSecond (m * n)
  add (ClicksPerSecond m) (ClicksPerSecond n) = ClicksPerSecond (m + n)

instance ringClicks :: Ring Clicks where
  sub (Clicks m) (Clicks n) = Clicks (m - n)

instance ringClicksPerSecond :: Ring ClicksPerSecond where
  sub (ClicksPerSecond m) (ClicksPerSecond n) = ClicksPerSecond (m - n)

instance prettyClicks :: Pretty Clicks where
  prettify (Clicks n) = prettify n ++ " c"

instance prettyClicksPerSecond :: Pretty ClicksPerSecond where
  prettify (ClicksPerSecond n) = prettify n ++ " cps"

instance serializeClicks :: Serialize Clicks where
  serialize (Clicks n) = serialize n

instance serializeClicksPerSecond :: Serialize ClicksPerSecond where
  serialize (ClicksPerSecond n) = serialize n

newtype Population = Population Number

instance prettyPopulation :: Pretty Population where
  prettify (Population n) = prettify n ++ " Clickonians"

