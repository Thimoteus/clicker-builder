module Blocks where

import Prelude hiding (div)
import Types
import React.DOM (text, button, div, div')
import React.DOM.Props (onMouseDown, _id)
import Signal.Channel (send)

actionButton :: Action -> String -> Component
actionButton act str env =
  button [onMouseDown \ _ -> send env.channel act] [text str]

infixr 5 =#=
(=#=) :: Action -> String -> Component
(=#=) = actionButton

foldComponent :: String -> Array Component -> Component
foldComponent name arr = \ env -> div [_id name] $ arr <*> [env]

foldComponent' :: Array Component -> Component
foldComponent' arr = \ env -> div' $ arr <*> [env]
