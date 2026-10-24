"""Numerical boundary regression: floating point must not promote a tied policy."""
import ast,pathlib,random,unittest
source=ast.parse((pathlib.Path(__file__).parent/'verify-claim-commitment.py').read_text());fn=next(n for n in source.body if isinstance(n,ast.FunctionDef) and n.name=='exact_seed_contrast');namespace={'random':random};exec(compile(ast.Module(body=[fn],type_ignores=[]),'<contrast>','exec'),namespace);contrast=namespace['exact_seed_contrast']
class ScoreArithmeticTests(unittest.TestCase):
 def test_balanced_whole_and_half_point_seeds_stay_exactly_tied(self):
  for units in [[1,1,1,1,1,-5,0,0],[.5,.5,.5,.5,.5,-2.5,0,0],[-3,1,1,1,0,0,0,0]]:
   difference,interval=contrast(units,48);self.assertEqual(difference,0);self.assertLessEqual(interval[0],0);self.assertGreaterEqual(interval[1],0)
 def test_zero_lower_bound_does_not_become_positive(self):
  difference,interval=contrast([0,0,0,0,0,0,0,1],48);self.assertGreater(difference,0);self.assertEqual(interval[0],0)
if __name__=='__main__':unittest.main()
