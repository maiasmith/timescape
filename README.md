
TimeScape is a visualization tool for temporal clonal evolution.

To run TimeScape, type the following commands in R:

install.packages("devtools") # if not already installed  
library(devtools)  
install_bitbucket("MO_BCCRC/timescape")  
library(timescape)  
example(timescape) # to run example

And the following visualizations will appear in your browser (optimized for Chrome):

The first visualization is of the acute myeloid leukemia patient from Ding et al., 2012:

![](aml_timescape.png)

The second visualization is of the metastatic ovarian cancer patient 7 from McPherson and Roth et al., 2016:

![](px7_timescape.png)

TimeScape was developed at the Shah Lab for Computational Cancer Biology at the BC Cancer Research Centre.

References:
Ding, Li, et al. "Clonal evolution in relapsed acute myeloid leukaemia revealed by whole-genome sequencing." Nature 481.7382 (2012): 506-510.
McPherson, Andrew, et al. "Divergent modes of clonal spread and intraperitoneal mixing in high-grade serous ovarian cancer." Nature genetics (2016).