module Age (
  ageDescription
  ) where

import Prelude
import Types

ageDescription :: Age -> Array String
ageDescription Stone =
  [ """You are a member of the hardy but technologically primitive Clickonian
  people. The other Clickonians generally defer to you when it comes to making
  important decisions. It is your task to shepherd your people through the
  Stone Age into a brighter, more prosperous future."""
  , """The tribe must develop various technologies and cultural achievements
  to stand any hope of surviving more than a few years.""" ]
ageDescription Bronze =
  [ """Earthquake! While you and your tribe have developed enough as a society
  to discover bronze's superiority as a material, perils still beset you."""
  , """In the aftermath of the tremors, you notice a previously-traversable path
  has transformed into an impassable barrier of rock. Unfortunately, the barrier
  now separates you and a small group of Clickonians from the rest of the tribe.
  """
  , """Your reduced population means everyone must work harder to survive. At
  nights, your fellow survivors whisper to each other in the hopes that they'll
  reunite with their lost friends and family on the other side ... """]
ageDescription _ = [ "Not implemented yet." ]
