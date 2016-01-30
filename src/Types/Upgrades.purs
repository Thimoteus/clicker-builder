module Types.Upgrades where

import Prelude
import Types.Class

import Data.Foreign.Class (IsForeign, readProp)

data Upgrade = Misc1 Int
             | Misc2 Int
             | Tech1 Int
             | Tech2 Int
             | Phil1 Int
             | Phil2 Int
             | Poli1 Int
             | Poli2 Int
             | Science1 Int
             | Science2 Int

newtype Upgrades = Upgrades { misc1 :: Upgrade
                            , misc2 :: Upgrade
                            , tech1 :: Upgrade
                            , tech2 :: Upgrade
                            , phil1 :: Upgrade
                            , phil2 :: Upgrade
                            , poli1 :: Upgrade
                            , poli2 :: Upgrade
                            , science1 :: Upgrade
                            , science2 :: Upgrade
                            }

instance isForeignUpgrades :: IsForeign Upgrades where
  read value = do
    _misc1 <- readProp "misc1" value
    _misc2 <- readProp "misc2" value
    _tech1 <- readProp "tech1" value
    _tech2 <- readProp "tech2" value
    _phil1 <- readProp "phil1" value
    _phil2 <- readProp "phil2" value
    _poli1 <- readProp "poli1" value
    _poli2 <- readProp "poli2" value
    _science1 <- readProp "science1" value
    _science2 <- readProp "science2" value
    pure $ Upgrades { misc1: Misc1 _misc1
                    , misc2: Misc2 _misc2
                    , tech1: Tech1 _tech1
                    , tech2: Tech2 _tech2
                    , phil1: Phil1 _phil1
                    , phil2: Phil2 _phil2
                    , poli1: Poli1 _poli1
                    , poli2: Poli2 _poli2
                    , science1: Science1 _science1
                    , science2: Science2 _science2
                    }

instance prettifyUpgrade :: Pretty Upgrade where
  prettify (Misc1 n) = prettify n
  prettify (Misc2 n) = prettify n
  prettify (Tech1 n) = prettify n
  prettify (Tech2 n) = prettify n
  prettify (Phil1 n) = prettify n
  prettify (Phil2 n) = prettify n
  prettify (Poli1 n) = prettify n
  prettify (Poli2 n) = prettify n
  prettify (Science1 n) = prettify n
  prettify (Science2 n) = prettify n

instance serializeUpgrade :: Serialize Upgrade where
  serialize (Misc1 n) = serialize n
  serialize (Misc2 n) = serialize n
  serialize (Tech1 n) = serialize n
  serialize (Tech2 n) = serialize n
  serialize (Phil1 n) = serialize n
  serialize (Phil2 n) = serialize n
  serialize (Poli1 n) = serialize n
  serialize (Poli2 n) = serialize n
  serialize (Science1 n) = serialize n
  serialize (Science2 n) = serialize n

instance serializeUpgrades :: Serialize Upgrades where
  serialize (Upgrades u) = """{ "misc1": """
    ++ serialize u.misc1 ++ """, "misc2": """
    ++ serialize u.misc2 ++ """, "tech1": """
    ++ serialize u.tech1 ++ """, "tech2": """
    ++ serialize u.tech2 ++ """, "phil1": """
    ++ serialize u.phil1 ++ """, "phil2": """
    ++ serialize u.phil2 ++ """, "poli1": """
    ++ serialize u.poli1 ++ """, "poli2": """
    ++ serialize u.poli2 ++ """, "science1": """
    ++ serialize u.science1 ++ """, "science2": """
    ++ serialize u.science2 ++ "}"

initialUpgrades :: Upgrades
initialUpgrades = Upgrades { misc1: Misc1 0
                           , misc2: Misc2 0
                           , tech1: Tech1 0
                           , tech2: Tech2 0
                           , phil1: Phil1 0
                           , phil2: Phil2 0
                           , poli1: Poli1 0
                           , poli2: Poli2 0
                           , science1: Science1 0
                           , science2: Science2 0
                           }
