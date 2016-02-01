module Types.Age where

import Prelude
import Types.Class
import Types.Numbers

import Data.Foldable (intercalate)

data Age = Stone
         | Bronze
         | Iron
         | Classical
         | Dark
         | Medieval
         | Renaissance
         | Imperial
         | Industrial
         | Nuclear
         | Information
         | Global
         | Space
         | Solar

instance ageShow :: Show Age where
  show Stone = "Stone"
  show Bronze = "Bronze"
  show Iron = "Iron"
  show Classical = "Classical"
  show Dark = "Dark"
  show Medieval = "Medieval"
  show Renaissance = "Renaissance"
  show Imperial = "Imperial"
  show Industrial = "Industrial"
  show Nuclear = "Nuclear"
  show Information = "Information"
  show Global = "Global"
  show Space = "Space"
  show Solar = "Solar"

instance prettyAge :: Pretty Age where
  prettify = show

instance serializeAge :: Serialize Age where
  serialize = show

type BronzeSRec = { population :: Population
                  , disasterStack :: Int }
data AgeState = BronzeS BronzeSRec
              | NoAgeState

instance serializeAgeState :: Serialize AgeState where
  serialize NoAgeState = ""
  serialize (BronzeS { population, disasterStack }) =
    intercalate "," $ [ serialize population, serialize disasterStack ]

class UnsafeBronze
foreign import unsafeBronze :: forall a. (UnsafeBronze => a) -> a
