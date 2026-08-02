# Rates carry their counts, not a rounded percentage

Course success was computed in two places that rounded differently — two decimal
places stored inside the repository, one decimal in the data page, and zero on
the dashboard, all claiming to be the same figure. Derived rates now carry their
numerator and denominator rather than a percentage, and rounding happens where
the number is displayed.

This is deliberate and should not be "simplified" back into a single rate field.
Carrying both counts makes disagreement over precision impossible rather than
merely fixed, lets a chart use the exact proportion, and lets a page render
"142 of 210" — which is what makes an equity claim readable. A rate whose
denominator is zero is absent, not zero.
