import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  points: number;
}

interface QuizResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  isCorrect: boolean;
  points: number;
}

interface QuizComponentProps {
  quizId: string;
  title: string;
  passingScore: number;
  onComplete: () => void;
}

const QuizComponent = ({ quizId, title, passingScore, onComplete }: QuizComponentProps) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      // Use secure function to get questions WITHOUT correct answers
      const { data, error } = await supabase
        .rpc('get_quiz_questions_for_student', { p_quiz_id: quizId });

      if (error) {
        console.error('Error fetching questions:', error);
        setLoading(false);
        return;
      }

      // Parse options from JSONB
      const parsedQuestions = (data || []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string),
        points: q.points || 1,
      }));

      setQuestions(parsedQuestions);
      setLoading(false);
    };

    fetchQuestions();
  }, [quizId]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    // Check each answer using secure function
    const quizResults: QuizResult[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const q of questions) {
      maxScore += q.points;
      const userAnswer = answers[q.id] || '';
      
      // Use secure function to check answer - only reveals correct answer after submission
      const { data, error } = await supabase
        .rpc('check_quiz_answer', { 
          p_question_id: q.id, 
          p_answer: userAnswer 
        });

      if (error) {
        console.error('Error checking answer:', error);
        continue;
      }

      const result = data?.[0];
      const isCorrect = result?.is_correct || false;
      
      if (isCorrect) {
        totalScore += q.points;
      }

      quizResults.push({
        questionId: q.id,
        questionText: q.question_text,
        userAnswer,
        correctAnswer: result?.correct_answer || '',
        explanation: result?.explanation || null,
        isCorrect,
        points: q.points,
      });
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    setScore(percentage);
    setResults(quizResults);
    setShowResults(true);

    // Save attempt
    if (user) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score: totalScore,
        max_score: maxScore,
        passed: percentage >= passingScore,
        answers,
        completed_at: new Date().toISOString(),
      });
    }

    setSubmitting(false);

    if (percentage >= passingScore) {
      toast({
        title: '🎉 Congratulations!',
        description: `You passed with ${Math.round(percentage)}%!`,
      });
    } else {
      toast({
        title: 'Keep practicing!',
        description: `You scored ${Math.round(percentage)}%. Need ${passingScore}% to pass.`,
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setResults([]);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No questions available for this quiz.
      </div>
    );
  }

  if (showResults) {
    const passed = score >= passingScore;
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              passed ? "bg-primary/20" : "bg-destructive/20"
            )}>
              {passed ? (
                <Trophy className="h-10 w-10 text-primary" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {passed ? 'Quiz Passed!' : 'Not quite there yet'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{Math.round(score)}%</p>
              <p className="text-muted-foreground">
                {passed ? 'Great job!' : `You need ${passingScore}% to pass`}
              </p>
            </div>

            {/* Review Answers */}
            <div className="space-y-4">
              <h3 className="font-semibold">Review your answers:</h3>
              {results.map((result, index) => (
                <div key={result.questionId} className={cn(
                  "p-4 rounded-lg border",
                  result.isCorrect ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
                )}>
                  <div className="flex items-start gap-2">
                    {result.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">Q{index + 1}: {result.questionText}</p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: <span className={result.isCorrect ? "text-primary" : "text-destructive"}>{result.userAnswer || 'Not answered'}</span>
                      </p>
                      {!result.isCorrect && (
                        <p className="text-sm text-primary mt-1">
                          Correct answer: {result.correctAnswer}
                        </p>
                      )}
                      {result.explanation && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {result.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            {!passed && (
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button onClick={onComplete} className="flex-1 gradient-primary">
              Continue Learning
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{title}</CardTitle>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">{currentQuestion.question_text}</h3>
            
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={handleAnswerSelect}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-lg border border-border/50 cursor-pointer transition-all",
                    answers[currentQuestion.id] === option
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleAnswerSelect(option)}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                className="gradient-primary"
                disabled={Object.keys(answers).length !== questions.length || submitting}
              >
                {submitting ? 'Checking...' : 'Submit Quiz'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
              >
                Next
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuizComponent;
