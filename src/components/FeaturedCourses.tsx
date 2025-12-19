import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

const featuredCourses = [
  {
    id: "adas-bootcamp",
    title: "ADAS & Autonomous Driving Bootcamp",
    description: "Learn system design, safety (ISO 26262/SOTIF), simulation, and validation for advanced driver assistance systems.",
    priceEUR: "€249",
    priceINR: "₹24,999",
    level: "Advanced",
    featured: true
  },
  {
    id: "motion-planning-bootcamp",
    title: "Motion Prediction & Planning Bootcamp",
    description: "Learn how self-driving cars forecast future trajectories and plan safe motion using A*, Frenet/Lattice planners, and MPC.",
    priceEUR: "€99",
    priceINR: "₹9,999",
    level: "Advanced",
    featured: true
  },
  {
    id: "ai-bootcamp",
    title: "AI Bootcamp",
    description: "Learn machine learning, deep learning, reinforcement learning, and generative AI for robotics and autonomous systems.",
    priceEUR: "€150",
    priceINR: "₹15,000",
    level: "Intermediate",
    featured: true
  }
];

const FeaturedCourses = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Featured Bootcamps
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our most popular courses designed for engineers who want to excel in autonomous systems
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredCourses.map((course, index) => (
            <Card 
              key={course.id} 
              className="flex flex-col shadow-soft hover:shadow-glow transition-smooth hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{course.level}</Badge>
                  <div className="text-right">
                    <div className="font-bold text-lg text-primary">{course.priceEUR}</div>
                    <div className="text-sm text-muted-foreground">{course.priceINR}</div>
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  {course.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="text-base">
                  {course.description}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Link to={`/course/${course.id}`} className="w-full">
                  <Button className="w-full gradient-primary group">
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/courses">
            <Button size="lg" variant="outline" className="group">
              View All Courses
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCourses;
