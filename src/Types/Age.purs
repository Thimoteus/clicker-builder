module Types.Age where

import Prelude
import Types.Class

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
