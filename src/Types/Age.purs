module Types.Age where

import Prelude
import Types.Class
import Types.Numbers

import Data.Foldable (intercalate)

data Age = Stone
         | Bronze
         | Heroic
         | Iron
         | Philosophical
         | Classical
         | Wonders
         | Holy
         | Draconic
         | Dark
         | Medieval
         | Alchemical
         | Renaissance
         | Piracy
         | Imperial
         | Industrial
         | Nuclear
         | Information
         | Global
         | Space
         | Solar
         | Interstellar

instance ageShow :: Show Age where
  show Stone = "Stone"
  show Bronze = "Bronze"
  show Heroic = "Heroic"
  show Iron = "Iron"
  show Philosophical = "Philosophical"
  show Classical = "Classical"
  show Wonders = "Wonders"
  show Holy = "Holy"
  show Draconic = "Draconic"
  show Dark = "Dark"
  show Medieval = "Medieval"
  show Alchemical = "Alchemical"
  show Renaissance = "Renaissance"
  show Piracy = "Piracy"
  show Imperial = "Imperial"
  show Industrial = "Industrial"
  show Nuclear = "Nuclear"
  show Information = "Information"
  show Global = "Global"
  show Space = "Space"
  show Solar = "Solar"
  show Interstellar = "Interstellar"

instance prettyAge :: Pretty Age where
  prettify = show

instance serializeAge :: Serialize Age where
  serialize = show

type BronzeSRec = { population :: Population
                  , disasterStack :: Int
                  , stackRemoval :: Int
                  }
data AgeState = BronzeS BronzeSRec
              | NoAgeState

instance serializeAgeState :: Serialize AgeState where
  serialize NoAgeState = ""
  serialize (BronzeS { population, disasterStack, stackRemoval }) =
    intercalate "," [ serialize population
                    , serialize disasterStack
                    , serialize stackRemoval
                    ]

class UnsafeBronze
foreign import unsafeBronze :: forall a. (UnsafeBronze ⇒ a) → a
