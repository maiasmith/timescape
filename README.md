
TimeScape is a visualization tool for temporal clonal evolution.

# Development Instructions

To debug / develop timescape, run the following:

```r
# load the up-to-date local code
source("./R/timescape.R")

# run your timescape commands, example below:
tree_edges <- read.csv(system.file("extdata", "AML_tree_edges.csv", package = "timescape"))
clonal_prev <- read.csv(system.file("extdata", "AML_clonal_prev.csv", package = "timescape"))
mutations <- read.csv(system.file("extdata", "AML_mutations.csv", package = "timescape"))
perturbations <- data.frame(pert_name = c("Chemotherapy"), prev_tp = c("Diagnosis"), frac = c(0.1))
timescape(clonal_prev = clonal_prev, tree_edges = tree_edges, perturbations = perturbations, height=260)
```

# Installation 

To install TimeScape, type the following commands in R:


```r
# try http:// if https:// URLs are not supported
source("https://bioconductor.org/biocLite.R")
biocLite("timescape")
```

# Examples 

Run the examples by: 


```r
example("timescape")
```

# Documentation 

To view the documentation for TimeScape, type the following command in R:


```r
?timescape
```

or:


```r
browseVignettes("timescape") 
```

# References

TimeScape was developed at the Shah Lab for Computational Cancer Biology at the BC Cancer Research Centre.
